// /src/app/api/orders/capture/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { sendOrderReceipt, notifyAdminNewOrder } from '@/lib/email';
import {
  formatPrintifyError,
  isPrintifyAutoSubmitEnabled,
  mergeOrderRaw,
  submitPrintifyFulfillment,
  type ShippingSnapshot,
} from '@/lib/printifyFulfillment';

export const runtime = 'nodejs';

type CartLine = {
  sku: string;
  title: string;
  qty: number;
  price: number;          // may be cents or major units (normalized below)
  size?: string;
  color?: string;
  image?: string;
  printifyProductId?: string;
  printifyVariantId?: number;
};

// Customer payload from CheckoutForm
type Customer = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string; // ISO-2
};

type Body = {
  paypalOrderId?: string;
  cart: CartLine[];
  currency?: string;
  shipping?: number;
  tax?: number;
  payer?: { email?: string; name?: string };
  paypalRaw?: unknown;
  customer?: Customer; // optional
};

/** ---------------- PayPal minimal types (server) ---------------- */
type PPName = { given_name?: string; surname?: string; full_name?: string };
type PPPayer = { email_address?: string; name?: PPName };
type PPCapture = { id?: string };
type PPPayments = { captures?: PPCapture[] };
type PPAmt = { value?: string; currency_code?: string };

type PPShippingAddr = {
  address_line_1?: string;
  address_line_2?: string;
  admin_area_1?: string;
  admin_area_2?: string;
  postal_code?: string;
  country_code?: string;
};

type PPShipping = { name?: { full_name?: string }; address?: PPShippingAddr };

type PPPurchaseUnit = {
  amount?: PPAmt;
  payments?: PPPayments;
  shipping?: PPShipping;
};

type PPOrder = { id?: string; payer?: PPPayer; purchase_units?: PPPurchaseUnit[] };

/** ---------------- PayPal helpers ---------------- */
function paypalBase() {
  return process.env.PAYPAL_ENV === 'live' || process.env.PAYPAL_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function getPayPalAccessToken(): Promise<{ token: string; base: string } | null> {
  const id = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_SECRET;
  if (!id || !secret) return null;

  const creds = Buffer.from(`${id}:${secret}`).toString('base64');
  const base = paypalBase();

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  if (!res.ok) {
    console.error('[paypal] token fail', res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ? { token: data.access_token, base } : null;
}

async function fetchPayPalOrder(id: string, token: string, base: string): Promise<PPOrder> {
  const res = await fetch(`${base}/v2/checkout/orders/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const json = (await res.json()) as unknown;
  if (!res.ok) {
    console.error('[paypal] order fetch fail', res.status, json);
    throw new Error('PAYPAL_VERIFY_FAILED');
  }
  return json as PPOrder;
}

async function capturePayPalOrder(id: string, token: string, base: string): Promise<PPOrder> {
  const res = await fetch(`${base}/v2/checkout/orders/${id}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  const json = (await res.json()) as unknown;

  if (!res.ok) {
    console.error('[paypal] capture fail', res.status, json);
    const existing = await fetchPayPalOrder(id, token, base).catch(() => null);
    if (existing?.purchase_units?.[0]?.payments?.captures?.length) return existing;
    throw new Error('PAYPAL_CAPTURE_FAILED');
  }

  return json as PPOrder;
}

/** ---------------- Util helpers ---------------- */
function dec(n: number | string | null | undefined) {
  const v = typeof n === 'number' ? n : n ? Number(n) : 0;
  return new Prisma.Decimal(v.toFixed(2));
}

// Normalize to major units (e.g., 1999 cents -> 19.99)
function toMajorUnits(possibleCents: number): number {
  return possibleCents >= 1000 ? possibleCents / 100 : possibleCents;
}

async function generateOrderId(): Promise<string> {
  const d = new Date();
  const yymmdd = [
    String(d.getUTCFullYear()).slice(-2),
    String(d.getUTCMonth() + 1).padStart(2, '0'),
    String(d.getUTCDate()).padStart(2, '0'),
  ].join('');
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `KK-${yymmdd}-${rand}`;
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function splitName(full?: string | null): { first: string | null; last: string | null } {
  if (!full) return { first: null, last: null };
  const parts = full.trim().split(/\s+/);
  const first = parts.shift() ?? null;
  const last = parts.length ? parts.join(' ') : null;
  return { first, last };
}

type NormalizedLine = CartLine & {
  qty: number;
  price: number;
};

/** ---------------------------- POST ---------------------------- */
export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad('INVALID_JSON');
  }

  if (!body?.cart || !Array.isArray(body.cart) || body.cart.length === 0) {
    return bad('CART_REQUIRED');
  }

  const currency = (body.currency || process.env.NEXT_PUBLIC_CURRENCY || 'USD').toUpperCase();
  const shipping = Number(body.shipping ?? 0);
  const tax = typeof body.tax === 'number' ? body.tax : 0;

  // Normalize line items
  const normalizedLines: NormalizedLine[] = body.cart.map((l) => {
    const printifyVariantId = Number(l.printifyVariantId);
    return {
      ...l,
      sku: String(l.sku ?? ''),
      title: String(l.title ?? 'Product'),
      price: toMajorUnits(Number(l.price) || 0),
      qty: Math.max(1, Number(l.qty) || 1),
      printifyVariantId: Number.isFinite(printifyVariantId) ? printifyVariantId : undefined,
    };
  });

  const subtotal = normalizedLines.reduce((s, l) => s + l.price * l.qty, 0);
  const total = subtotal + shipping + tax;

  // -------- Optional PayPal verification & shipping fallback --------
  let payerEmail = body.payer?.email ?? body.customer?.email ?? undefined;
  let payerName =
    body.payer?.name ??
    (body.customer ? `${body.customer.firstName} ${body.customer.lastName}`.trim() : undefined);
  let captureId: string | undefined;
  let paypalRaw: unknown = body.paypalRaw;

  // Fields we may fill from PayPal if form wasn't supplied
  let ppShip: PPShippingAddr | undefined;
  let ppFullName: string | undefined;

  if (body.paypalOrderId) {
    const creds = await getPayPalAccessToken();
    if (creds) {
      try {
        let ppo = await capturePayPalOrder(body.paypalOrderId, creds.token, creds.base);
        if (!ppo.purchase_units?.[0]?.payments?.captures?.length) {
          ppo = await fetchPayPalOrder(body.paypalOrderId, creds.token, creds.base);
        }
        paypalRaw = paypalRaw ?? ppo;

        // payer details
        payerEmail = ppo?.payer?.email_address ?? payerEmail;
        const given = ppo?.payer?.name?.given_name ?? '';
        const surname = ppo?.payer?.name?.surname ?? '';
        payerName = (given || surname) ? `${given} ${surname}`.trim() : payerName;

        const pu = ppo?.purchase_units?.[0];
        const apiTotal = pu?.amount?.value ? Number(pu.amount.value) : undefined;

        // capture id if present
        const cap = pu?.payments?.captures?.[0];
        captureId = cap?.id ?? body.paypalOrderId;

        // shipping snapshot from PayPal (fallback if form not present)
        if (pu?.shipping?.address) ppShip = pu.shipping.address;
        if (pu?.shipping?.name?.full_name) ppFullName = pu.shipping.name.full_name;

        if (typeof apiTotal === 'number') {
          const delta = Math.abs(apiTotal - total);
          if (delta > 0.02) {
            console.error('[paypal] total mismatch', { apiTotal, computedTotal: total, currency });
            return bad('TOTAL_MISMATCH');
          }
        }
      } catch (e) {
        console.error('[paypal] capture/verify failed', e);
        return bad('PAYPAL_CAPTURE_FAILED', 502);
      }
    } else {
      console.error('[paypal] capture skipped: missing credentials');
      return bad('PAYPAL_CREDENTIALS_MISSING', 500);
    }
  }

  // -------- Persist in DB --------
  const orderId = await generateOrderId();

  // Upsert customer (optional if no email)
  let customerId: string | null = null;
  if (payerEmail) {
    const [firstName, ...rest] = (payerName ?? '').split(' ').filter(Boolean);
    const lastName = rest.join(' ') || null;

    const cust = await prisma.customer.upsert({
      where: { email: payerEmail },
      update: { firstName: firstName || null, lastName },
      create: { email: payerEmail, firstName: firstName || null, lastName },
      select: { id: true },
    });
    customerId = cust.id;
  }

  // Prefer the shipping/customer block from the form if available; otherwise fall back to PayPal shipping
  const c = body.customer;
  const ppNameParts = splitName(ppFullName);

  const shipFirstName = c?.firstName ?? ppNameParts.first ?? null;
  const shipLastName  = c?.lastName ?? ppNameParts.last ?? null;
  const shipEmail     = c?.email ?? payerEmail ?? null;
  const shipPhone     = c?.phone ?? null;

  const shipAddress1  = c?.address1 ?? ppShip?.address_line_1 ?? null;
  const shipAddress2  = c?.address2 ?? ppShip?.address_line_2 ?? null;
  const shipCity      = c?.city ?? ppShip?.admin_area_2 ?? null;
  const shipState     = c?.state ?? ppShip?.admin_area_1 ?? null;
  const shipPostal    = c?.postalCode ?? ppShip?.postal_code ?? null;
  const shipCountry   = c?.country ?? ppShip?.country_code ?? null;

  const shippingSnapshot: ShippingSnapshot = {
    firstName: shipFirstName,
    lastName: shipLastName,
    email: shipEmail,
    phone: shipPhone,
    address1: shipAddress1,
    address2: shipAddress2,
    city: shipCity,
    state: shipState,
    postalCode: shipPostal,
    country: shipCountry,
  };

  const rawPayload = {
    raw: (paypalRaw ?? null) as Prisma.InputJsonValue,
    customer: (c ?? null) as Prisma.InputJsonValue,
    printifyAutoSubmit: isPrintifyAutoSubmitEnabled(),
  };

  const order = await prisma.order.create({
    data: {
      id: orderId,
      status: 'PAID',
      currency,
      amountTotal: dec(total),
      amountSubtotal: dec(subtotal),
      amountShipping: dec(shipping),
      amountTax: typeof body.tax === 'number' ? dec(body.tax) : null,

      payerEmail: payerEmail ?? null,
      payerName: payerName ?? null,
      captureId: captureId ?? null,

      // Denormalized shipping/customer snapshot fields (now includes address1/2 fallbacks)
      shipFirstName,
      shipLastName,
      shipEmail,
      shipPhone,
      shipAddress1: shipAddress1,
      shipAddress2: shipAddress2,
      shipCity:     shipCity,
      shipState:    shipState,
      shipPostalCode: shipPostal,
      shipCountry:  shipCountry,

      // legacy single-product columns (kept nullable)
      productTitle: null,
      productSlug: null,
      selectedSize: null,
      sku: null,

      // Keep full payloads for auditing
      raw: rawPayload as Prisma.InputJsonValue,

      buyerEmail: payerEmail ?? null,
      customerId,

      items: {
        create: normalizedLines.map((l) => ({
          sku: String(l.sku),
          title: String(l.title),
          size: l.size ?? null,
          color: l.color ?? null,
          printifyProductId: l.printifyProductId ?? null,
          printifyVariantId: l.printifyVariantId ?? null,
          unitPrice: dec(l.price), // major units
          qty: l.qty,
          image: l.image ?? null,
        })),
      },
    },
    include: { items: true },
  });

  let fulfillmentRaw: unknown = null;
  let fulfillmentStatus = isPrintifyAutoSubmitEnabled() ? 'Pending Printify submission' : 'Manual review';
  if (isPrintifyAutoSubmitEnabled()) {
    try {
      const printifyResult = await submitPrintifyFulfillment({
        orderId: order.id,
        lines: normalizedLines,
        shipping: shippingSnapshot,
      });
      fulfillmentRaw = { printify: printifyResult.response, printifyPayload: printifyResult.payload };
      fulfillmentStatus = 'Submitted to Printify';

      try {
        await prisma.order.update({
          where: { seq: order.seq },
          data: {
            status: 'FULFILLMENT_SUBMITTED',
            printifyOrderId: printifyResult.response.id,
            printifyStatus: printifyResult.response.status ?? 'submitted',
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
      } catch (updateError) {
        console.warn('[printify] fulfillment status update failed', updateError);
      }
    } catch (error) {
      const message = formatPrintifyError(error);
      fulfillmentRaw = { printifyError: message };
      fulfillmentStatus = 'Printify submission failed';
      console.warn('[printify] fulfillment submit failed', error);

      try {
        await prisma.order.update({
          where: { seq: order.seq },
          data: {
            status: 'FULFILLMENT_FAILED',
            printifyStatus: 'failed',
            printifyLastError: message,
            raw: mergeOrderRaw(order.raw as Prisma.JsonValue | null, {
              ...rawPayload,
              printifyError: message,
            }),
          },
        });
      } catch (updateError) {
        console.warn('[printify] fulfillment failure status update failed', updateError);
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
          process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kamikulture.com'
        }/track-order?orderID=${order.id}&email=${encodeURIComponent(payerEmail)}`,
      });
    }

    await notifyAdminNewOrder({
      orderNumber: order.id,
      customerEmail: payerEmail ?? undefined,
      customerName: payerName ?? undefined,
      fulfillmentStatus,
      adminUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kamikulture.com'}/admin/orders?q=${encodeURIComponent(order.id)}`,
      currency,
      items: lineItems,
      ...amounts,
      raw: {
        order,
        fulfillment: fulfillmentRaw,
      },
    });
  } catch (e) {
    console.warn('[email] send failed', e);
  }

  return NextResponse.json({ ok: true, orderId: order.id }, { status: 201 });
}
