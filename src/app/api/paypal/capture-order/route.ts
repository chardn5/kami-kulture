import { NextRequest, NextResponse } from 'next/server';
import { captureOrder, showOrder } from '@/lib/paypal'; // ensure showOrder exists
import { emailOrderJSON } from '@/lib/email';

export const runtime = 'nodejs';

type PaypalCapture = {
  status?: string;
  payer?: { email_address?: string };
  payment_source?: { paypal?: { email_address?: string } };
} & Record<string, unknown>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function getPayerEmail(c: PaypalCapture): string | null {
  return c.payer?.email_address ?? c.payment_source?.paypal?.email_address ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderID = isRecord(body) && typeof body.orderID === 'string' ? body.orderID : '';
    const emailOverride = isRecord(body) && typeof body.emailOverride === 'string' ? body.emailOverride : undefined;
    if (!orderID) return NextResponse.json({ ok: false, error: 'INVALID_ORDER_ID' }, { status: 400 });

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

    // Send to ORDER_TO_EMAIL by default (or override if provided)
    let emailSent = false;
    try {
      await emailOrderJSON(`Kami Kulture Order ${orderID}`, capture, emailOverride ? { to: emailOverride } : undefined);
      emailSent = true;

      // Optional: also send to payer in LIVE if explicitly enabled
      if (process.env.PAYPAL_ENV !== 'sandbox' && process.env.SEND_PAYER_RECEIPT === '1') {
        const payer = getPayerEmail(capture);
        if (payer) await emailOrderJSON(`Your Kami Kulture order ${orderID}`, capture, { to: payer });
      }
    } catch {
      // swallow; email must not block the flow
    }

    return NextResponse.json({ ok: true, orderID, emailSent }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: 'CAPTURE_FAILED' }, { status: 500 });
  }
}
