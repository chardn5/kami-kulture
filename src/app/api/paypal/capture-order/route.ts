// src/app/api/paypal/capture-order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { captureOrder, showOrder } from '@/lib/paypal'; // your existing helpers
import { emailOrderJSON } from '@/lib/email';            // your existing helper
import { prisma } from '@/lib/prisma';                   // Prisma client -> Neon

export const runtime = 'nodejs';

/** ---- Types & helpers ---- */
type PaypalAmount = { value?: string; currency_code?: string };
type PaypalCaptureUnit = {
  payments?: { captures?: Array<{ id?: string; amount?: PaypalAmount }> };
  amount?: PaypalAmount; // sometimes amount is here pre-capture
};
type PaypalPayer = {
  email_address?: string;
  name?: { given_name?: string; surname?: string };
};

type PaypalCapture = {
  id?: string;               // PayPal order ID
  status?: string;
  payer?: PaypalPayer;
  payment_source?: { paypal?: { email_address?: string } };
  purchase_units?: PaypalCaptureUnit[];
} & Record<string, unknown>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function getPayerEmail(c: PaypalCapture): string | null {
  return c.payer?.email_address ?? c.payment_source?.paypal?.email_address ?? null;
}

function getPayerName(c: PaypalCapture): string | undefined {
  const g = c.payer?.name?.given_name;
  const s = c.payer?.name?.surname;
  const full = [g, s].filter(Boolean).join(' ');
  return full || undefined;
}

function extractAmounts(c: PaypalCapture): { amount: string; currency: string; captureId?: string } {
  // Prefer actual capture amount if present; fall back to unit amount
  const unit = c.purchase_units?.[0];
  const cap = unit?.payments?.captures?.[0];

  const amount =
    cap?.amount?.value ??
    unit?.amount?.value ??
    '0.00';

  const currency =
    cap?.amount?.currency_code ??
    unit?.amount?.currency_code ??
    'USD';

  return { amount, currency, captureId: cap?.id };
}

/** ---- Handler ---- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderID = isRecord(body) && typeof body.orderID === 'string' ? body.orderID : '';
    const emailOverride = isRecord(body) && typeof body.emailOverride === 'string' ? body.emailOverride : undefined;

    // Optional product metadata from client (so we can store what they bought)
    const productTitle =
      isRecord(body) && typeof body.productTitle === 'string' ? body.productTitle : undefined;
    const productSlug =
      isRecord(body) && typeof body.productSlug === 'string' ? body.productSlug : undefined;
    const selectedSize =
      isRecord(body) && typeof body.selectedSize === 'string' ? body.selectedSize : undefined;
    const sku =
      isRecord(body) && typeof body.sku === 'string' ? body.sku : undefined;

    if (!orderID) {
      return NextResponse.json({ ok: false, error: 'INVALID_ORDER_ID' }, { status: 400 });
    }

    // 1) Capture (or fetch if already captured)
    let capture: PaypalCapture;
    try {
      capture = (await captureOrder(orderID)) as PaypalCapture;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('ORDER_ALREADY_CAPTURED')) {
        capture = (await showOrder(orderID)) as PaypalCapture;
      } else {
        throw e;
      }
    }

    // 2) Email JSON (non-blocking for success)
    let emailSent = false;
    try {
      await emailOrderJSON(
        `Kami Kulture Order ${orderID}`,
        capture,
        emailOverride ? { to: emailOverride } : undefined
      );
      emailSent = true;

      // Optional: email the payer in LIVE if enabled
      if (process.env.PAYPAL_ENV !== 'sandbox' && process.env.SEND_PAYER_RECEIPT === '1') {
        const payer = getPayerEmail(capture);
        if (payer) {
          await emailOrderJSON(`Your Kami Kulture order ${orderID}`, capture, { to: payer });
        }
      }
    } catch {
      // Swallow: email failures must not block capture/DB
    }

    // 3) Save/Upsert to Neon via Prisma
    const { amount, currency, captureId } = extractAmounts(capture);
    const payerEmail = getPayerEmail(capture) ?? undefined;
    const payerName = getPayerName(capture);
    const status = capture.status ?? 'UNKNOWN';

    await prisma.order.upsert({
      where: { id: orderID },
      create: {
        id: orderID,
        status,
        amountTotal: amount,
        currency,
        payerEmail,
        payerName,
        captureId,
        productTitle,
        productSlug,
        selectedSize,
        sku,
        raw: capture as any,
        buyerEmail: payerEmail,
      },
      update: {
        status,
        amountTotal: amount,
        currency,
        payerEmail,
        payerName,
        captureId,
        productTitle,
        productSlug,
        selectedSize,
        sku,
        raw: capture as any,
      },
    });

    return NextResponse.json({ ok: true, orderID, emailSent }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'CAPTURE_FAILED';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
