// /src/app/api/orders/capture/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { sendOrderReceipt, notifyAdminNewOrder } from '@/lib/email';

export const runtime = 'nodejs';

type CartLine = {
  sku: string;
  title: string;
  qty: number;
  // client may send cents or major units (we normalize below)
  price: number;
  size?: string;
  image?: string;
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
  country: string; // e.g., "PH"
};

type Body = {
  paypalOrderId?: string;
  cart: CartLine[];
  currency?: string;
  shipping?: number;
  tax?: number;
  payer?: { email?: string; name?: string };
  paypalRaw?: unknown;
  customer?: Customer; // from the form (optional for backward-compat)
};

/** ---------------- PayPal minimal types (server) ---------------- */
type PPName = { given_name?: string; surname?: string };
type PPPayer = { email_address?: string; name?: PPName };
type PPCapture = { id?: string };
type PPPayments = { captures?: PPCapture[] };
type PPAmt = { value?: string; currency_code?: string };
type PPPurchaseUnit = { amount?: PPAmt; payments?: PPPayments };
type PPOrder = { id?: string; payer?: PPPayer; purchase_units?: PPPurchaseUnit[] };

/** ---------------- PayPal helpers (optional) ---------------- */
async function getPayPalAccessToken(): Promise<{ token: string; base: string } | null> {
  const cid = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!cid || !secret) return null;

  const creds = Buffer.from(`${cid}:${secret}`).toString('base64');
  const base = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

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
  const normalizedLines = body.cart.map((l) => ({
    ...l,
    price: toMajorUnits(Number(l.price) || 0),
    qty: Number(l.qty) || 1,
  }));

  const subtotal = normalizedLines.reduce((s, l) => s + l.price * l.qty, 0);
  const total = subtotal + shipping + tax;

  // -------- Optional PayPal verification --------
  let payerEmail = body.payer?.email;
  let payerName = body.payer?.name;
  let captureId: string | undefined;
  let paypalRaw: unknown = body.paypalRaw;

  if (body.paypalOrderId) {
    const creds = await getPayPalAccessToken();
    if (creds) {
      try {
        const ppo = await fetchPayPalOrder(body.paypalOrderId, creds.token, creds.base);
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

        if (typeof apiTotal === 'number') {
          const delta = Math.abs(apiTotal - total);
          if (delta > 0.02) {
            console.error('[paypal] total mismatch', { apiTotal, computedTotal: total, currency });
            return bad('TOTAL_MISMATCH');
          }
        }
      } catch (e) {
        console.warn('[paypal] verify skipped/failed, continuing with client payload', e);
      }
    } else {
      captureId = body.paypalOrderId;
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

  // Prefer the shipping/customer block from the form if available
  const c = body.customer;

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

      // Denormalized shipping/customer snapshot fields
      shipFirstName: c?.firstName ?? null,
      shipLastName:  c?.lastName ?? null,
      shipEmail:     c?.email ?? payerEmail ?? null,
      shipPhone:     c?.phone ?? null,
      shipAddress1:  c?.address1 ?? null,
      shipAddress2:  c?.address2 ?? null,
      shipCity:      c?.city ?? null,
      shipState:     c?.state ?? null,
      shipPostalCode:c?.postalCode ?? null,
      shipCountry:   c?.country ?? null,

      // legacy single-product columns (kept nullable)
      productTitle: null,
      productSlug: null,
      selectedSize: null,
      sku: null,

      // Keep full payloads for auditing
      raw: {
        raw: (paypalRaw ?? null) as Prisma.InputJsonValue,
        customer: (c ?? null) as Prisma.InputJsonValue,
      } as Prisma.InputJsonValue,

      buyerEmail: payerEmail ?? null,
      customerId,

      items: {
        create: normalizedLines.map((l) => ({
          sku: String(l.sku),
          title: String(l.title),
          size: l.size ?? null,
          unitPrice: dec(l.price), // major units
          qty: l.qty,
          image: l.image ?? null,
        })),
      },
    },
    include: { items: true },
  });

  // -------- Emails (best-effort; non-blocking) --------
  try {
    // Flatten items with Decimal -> number conversion via .toNumber()
    const lineItems = order.items.map((i) => ({
      title: i.title,
      qty: i.qty,
      unitPrice: i.unitPrice.toNumber(),
      size: i.size ?? undefined,
      sku: i.sku,
      image: i.image ?? undefined,
    }));

    // Convert monetary fields safely with .toNumber()
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
        }/thank-you?orderID=${order.id}&email=${encodeURIComponent(payerEmail)}`,
      });
    }

    await notifyAdminNewOrder({
      orderNumber: order.id,
      customerEmail: payerEmail ?? undefined,
      currency,
      items: lineItems,
      ...amounts,
      raw: order,
    });
  } catch (e) {
    console.warn('[email] send failed', e);
  }

  return NextResponse.json({ ok: true, orderId: order.id }, { status: 201 });
}
