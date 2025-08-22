// /src/app/api/paypal/verify-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { appendOrder } from '@/lib/ordersLog';

function paypalBase() {
  return process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken() {
  const id = process.env.PAYPAL_CLIENT_ID ?? "";
  const secret = process.env.PAYPAL_SECRET ?? "";
  const creds = Buffer.from(`${id}:${secret}`).toString("base64");

  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`oauth2 token failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

type PayPalOrder = {
  id: string;
  status: string;
  payer?: { email_address?: string; name?: { given_name?: string; surname?: string } };
  purchase_units: Array<{
    custom_id?: string;
    amount: { value: string; currency_code: string };
    payments?: { captures?: Array<{ id: string }> };
  }>;
};

export async function POST(req: NextRequest) {
  try {
    const { orderId, expectedAmount } = (await req.json()) as {
      orderId?: string;
      expectedAmount?: number;
    };
    if (!orderId) return NextResponse.json({ ok: false, error: "Missing orderId" }, { status: 400 });

    const token = await getAccessToken();
    const res = await fetch(`${paypalBase()}/v2/checkout/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ ok: false, error: `PayPal lookup ${res.status}` }, { status: 502 });

    const order = (await res.json()) as PayPalOrder;

    const status = order.status;
    const pu = order.purchase_units?.[0];
    const amt = pu?.amount?.value ? Number(pu.amount.value) : NaN;
    const currency = pu?.amount?.currency_code ?? "USD";

    if (status !== "COMPLETED") {
      return NextResponse.json({ ok: false, error: `Order not completed (status=${status})` }, { status: 400 });
    }
    if (typeof expectedAmount === "number" && !Number.isNaN(amt) && Math.abs(amt - expectedAmount) > 0.005) {
      return NextResponse.json({ ok: false, error: "Amount mismatch" }, { status: 400 });
    }

    // ✅ LOG: append to orders file (non-blocking if it fails)
    try {
      await appendOrder({
        ts: Date.now(),
        orderId: order.id,
        amount: amt,
        currency,
        payerEmail: order.payer?.email_address ?? null,
        customId: pu?.custom_id ?? null,
      });
    } catch (e) {
      console.warn("[verify-order] appendOrder failed", e);
    }

    // Optional email via Resend (if configured)
    try {
      const inbox = process.env.ORDERS_INBOX || "orders@kamikulture.com";
      const to: string[] = [inbox];
      if (order.payer?.email_address) to.push(order.payer.email_address);

      const body = [
        `Order: ${order.id}`,
        `Status: ${status}`,
        `Amount: ${amt?.toFixed(2)} ${currency}`,
        `Custom ID: ${pu?.custom_id ?? "-"}`,
        `Payer: ${(order.payer?.name?.given_name ?? "") + " " + (order.payer?.name?.surname ?? "")}`.trim(),
        `Email: ${order.payer?.email_address ?? "-"}`,
        `Captures: ${pu?.payments?.captures?.map(c => c.id).join(", ") || "-"}`,
      ].join("\n");

      if (process.env.RESEND_API_KEY) {
        const { Resend } = await import("resend"); // ESM import (lint-safe)
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "orders@kamikulture.com",
          to,
          subject: `Kami Kulture Order ${order.id}`,
          text: body,
        });
      } else {
        console.log("[verify-order] Email skipped; RESEND_API_KEY not set\n" + body);
      }
    } catch (e) {
      console.error("Email send failed", e);
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      amount: amt,
      currency,
      payerEmail: order.payer?.email_address ?? null,
      customId: pu?.custom_id ?? null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

