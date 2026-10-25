import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendOrderReceipt, notifyAdminNewOrder } from "@/lib/email";
import {
  formatPrintifyError,
  isPrintifyAutoSubmitEnabled,
  mergeOrderRaw,
  submitPrintifyFulfillment,
  getOrderShippingSnapshot,
} from "@/lib/printifyFulfillment";
import {
  PRINTIFY_SYNC_ORDER_SELECT,
  refreshOrderFromPrintify,
} from "@/lib/printifyOrderSync";
import { paypalRequest, paypalEnvironment } from "@/lib/paypalServer";
import { verifyCompletedPayment } from "@/lib/checkoutSecurity";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!rateLimit(`capture:${ip}`, 15, 60_000).ok)
    return NextResponse.json(
      { ok: false, error: "Please wait a moment and try again." },
      { status: 429 },
    );
  const body = await req.json().catch(() => null);
  const paypalOrderId = body?.paypalOrderId;
  if (
    typeof paypalOrderId !== "string" ||
    !/^[A-Z0-9]{10,32}$/.test(paypalOrderId)
  ) {
    return NextResponse.json(
      { ok: false, error: "A valid PayPal order is required." },
      { status: 400 },
    );
  }
  try {
    return await captureOrder(paypalOrderId);
  } catch (error) {
    console.error(
      "[checkout] capture failed",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json(
      {
        ok: false,
        error:
          "We could not confirm payment yet. Try again with the same PayPal order, or contact support before making another payment.",
      },
      { status: 502 },
    );
  }
}

async function captureOrder(paypalOrderId: string) {
  let payment = await paypalRequest(`/v2/checkout/orders/${paypalOrderId}`);
  const unit = payment.purchase_units?.[0];
  if (!unit?.custom_id) throw new Error("ORDER_SNAPSHOT_REQUIRED");
  const pending = await prisma.order.findUnique({
    where: { id: unit.custom_id },
    include: { items: true },
  });
  if (!pending) throw new Error("ORDER_NOT_FOUND");
  const raw = pending.raw as Record<string, Prisma.JsonValue> | null;
  const checkout = raw?.checkout as
    | Record<string, Prisma.JsonValue>
    | undefined;
  if (!checkout || checkout.environment !== paypalEnvironment())
    throw new Error("ORDER_ENVIRONMENT_MISMATCH");
  const total = pending.amountTotal.toNumber();
  if (
    payment.purchase_units?.length !== 1 ||
    unit.amount?.currency_code !== pending.currency ||
    !Number.isFinite(Number(unit.amount?.value)) ||
    Math.round(Number(unit.amount?.value) * 100) !== Math.round(total * 100)
  ) {
    throw new Error("PAYMENT_AMOUNT_MISMATCH");
  }
  if (payment.status !== "COMPLETED") {
    try {
      payment = await paypalRequest(
        `/v2/checkout/orders/${paypalOrderId}/capture`,
        "POST",
        {},
        `capture-${paypalOrderId}`,
      );
    } catch {
      // A timed-out capture can have succeeded at PayPal; fetch before considering a retry.
      payment = await paypalRequest(`/v2/checkout/orders/${paypalOrderId}`);
    }
  }
  const captureId = verifyCompletedPayment(payment, {
    id: pending.id,
    currency: pending.currency,
    total,
  });
  if (pending.status !== "PENDING_PAYMENT") {
    if (pending.captureId !== captureId) throw new Error("CAPTURE_MISMATCH");
    return NextResponse.json({ ok: true, orderId: pending.id });
  }
  const payerEmail = pending.shipEmail ?? pending.buyerEmail ?? undefined;
  const payerName = [pending.shipFirstName, pending.shipLastName]
    .filter(Boolean)
    .join(" ");
  const rawPayload = {
    ...raw,
    raw: payment as unknown as Prisma.InputJsonValue,
    printifyAutoSubmit: isPrintifyAutoSubmitEnabled(),
  };
  // Only one request may transition this snapshot to PAID and start fulfillment/emails.
  const claimed = await prisma.order.updateMany({
    where: { id: pending.id, status: "PENDING_PAYMENT" },
    data: {
      status: "PAID",
      captureId,
      payerEmail,
      payerName,
      raw: rawPayload as Prisma.InputJsonValue,
    },
  });
  if (!claimed.count)
    return NextResponse.json({ ok: true, orderId: pending.id });
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: pending.id },
    include: { items: true },
  });
  const currency = order.currency;
  const shippingSnapshot = getOrderShippingSnapshot(order);
  const normalizedLines = order.items.map((i) => ({
    sku: i.sku,
    title: i.title,
    qty: i.qty,
    price: i.unitPrice.toNumber(),
    size: i.size ?? undefined,
    color: i.color ?? undefined,
    image: i.image ?? undefined,
    printifyProductId: i.printifyProductId ?? undefined,
    printifyVariantId: i.printifyVariantId ?? undefined,
  }));

  let fulfillmentRaw: unknown = null;
  let fulfillmentStatus = isPrintifyAutoSubmitEnabled()
    ? "Pending Printify submission"
    : "Manual review";
  if (isPrintifyAutoSubmitEnabled()) {
    try {
      const printifyResult = await submitPrintifyFulfillment({
        orderId: order.id,
        lines: normalizedLines,
        shipping: shippingSnapshot,
      });
      fulfillmentRaw = {
        printify: printifyResult.response,
        printifyPayload: printifyResult.payload,
      };
      fulfillmentStatus = "Submitted to Printify";

      try {
        await prisma.order.update({
          where: { seq: order.seq },
          data: {
            status: "FULFILLMENT_SUBMITTED",
            printifyOrderId: printifyResult.response.id,
            printifyStatus: printifyResult.response.status ?? "submitted",
            printifySubmittedAt: new Date(),
            printifyLastError: null,
            printifyPayload: printifyResult.payload as Prisma.InputJsonValue,
            raw: mergeOrderRaw(order.raw as Prisma.JsonValue | null, {
              ...rawPayload,
              printify: printifyResult.response as Prisma.InputJsonValue,
              printifyPayload: printifyResult.payload as Prisma.InputJsonValue,
            }),
          },
        });
        const syncOrder = await prisma.order.findUnique({
          where: { seq: order.seq },
          select: PRINTIFY_SYNC_ORDER_SELECT,
        });
        if (syncOrder) await refreshOrderFromPrintify(syncOrder);
      } catch (updateError) {
        console.warn(
          "[printify] fulfillment status update failed",
          updateError,
        );
      }
    } catch (error) {
      const message = formatPrintifyError(error);
      fulfillmentRaw = { printifyError: message };
      fulfillmentStatus = "Printify submission failed";
      console.warn("[printify] fulfillment submit failed", error);

      try {
        await prisma.order.update({
          where: { seq: order.seq },
          data: {
            status: "FULFILLMENT_FAILED",
            printifyStatus: "failed",
            printifyLastError: message,
            raw: mergeOrderRaw(order.raw as Prisma.JsonValue | null, {
              ...rawPayload,
              printifyError: message,
            }),
          },
        });
      } catch (updateError) {
        console.warn(
          "[printify] fulfillment failure status update failed",
          updateError,
        );
      }
    }
  }

  // -------- Emails (best-effort; non-blocking) --------
  try {
    const lineItems = order.items.map((i) => ({
      title: i.title,
      qty: i.qty,
      unitPrice: i.unitPrice.toNumber(),
      size: i.size ?? undefined,
      color: i.color ?? undefined,
      sku: i.sku,
      image: i.image ?? undefined,
    }));

    const amounts = {
      subtotal: order.amountSubtotal ? order.amountSubtotal.toNumber() : 0,
      shipping: order.amountShipping ? order.amountShipping.toNumber() : 0,
      tax: order.amountTax == null ? undefined : order.amountTax.toNumber(),
      total: order.amountTotal.toNumber(),
    };

    if (payerEmail) {
      await sendOrderReceipt({
        to: payerEmail,
        orderNumber: order.id,
        customerName: payerName ?? undefined,
        currency,
        items: lineItems,
        ...amounts,
        trackUrl: `${
          process.env.NEXT_PUBLIC_SITE_URL ?? "https://kamikulture.com"
        }/track-order?orderID=${order.id}&email=${encodeURIComponent(payerEmail)}`,
      });
    }

    await notifyAdminNewOrder({
      orderNumber: order.id,
      customerEmail: payerEmail ?? undefined,
      customerName: payerName ?? undefined,
      fulfillmentStatus,
      adminUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://kamikulture.com"}/admin/orders?q=${encodeURIComponent(order.id)}`,
      currency,
      items: lineItems,
      ...amounts,
      raw: {
        order,
        fulfillment: fulfillmentRaw,
      },
    });
  } catch (e) {
    console.warn("[email] send failed", e);
  }

  return NextResponse.json({ ok: true, orderId: order.id }, { status: 201 });
}
