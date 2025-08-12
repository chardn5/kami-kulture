import { NextRequest, NextResponse } from 'next/server';
import { captureOrder, showOrder } from '@/lib/paypal';
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
    const emailOverride = isRecord(body) && typeof body.emailOverride === 'string' ? body.emailOverride : null;
    if (!orderID) return NextResponse.json({ ok: false, error: 'INVALID_ORDER_ID' }, { status: 400 });

    let capture: PaypalCapture;

    try {
      capture = (await captureOrder(orderID)) as PaypalCapture;
      console.log('PAYPAL_CAPTURE_OK', orderID, capture.status);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('ORDER_ALREADY_CAPTURED')) {
        console.warn('ORDER_ALREADY_CAPTURED — fetching order details instead');
        capture = (await showOrder(orderID)) as PaypalCapture;
      } else {
        throw e;
      }
    }

    // Try email, but don't block success/redirect on email failure
    let emailSent = false;
    try {
      const to =
        emailOverride ||
        getPayerEmail(capture) ||
        process.env.ORDER_TO_EMAIL ||
        '';
      if (to && process.env.EMAIL_FROM && process.env.RESEND_API_KEY) {
        await emailOrderJSON(`Kami Kulture Order ${orderID}`, capture, { to });
        emailSent = true;
      } else {
        console.warn('EMAIL_SKIPPED', { to });
      }
    } catch (err) {
      console.error('EMAIL_SEND_ERROR', err);
    }

    return NextResponse.json({ ok: true, orderID, emailSent }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('/api/paypal/capture-order', message);
    return NextResponse.json({ ok: false, error: 'CAPTURE_FAILED' }, { status: 500 });
  }
}
