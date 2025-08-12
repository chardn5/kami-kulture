import { NextRequest, NextResponse } from 'next/server';
import { captureOrder } from '@/lib/paypal';
import { emailOrderJSON } from '@/lib/email';

export const runtime = 'nodejs';

type PaypalCapture = {
  payer?: { email_address?: string };
  payment_source?: { paypal?: { email_address?: string } };
  status?: string;
  [k: string]: any;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const orderID = isRecord(raw) && typeof raw.orderID === 'string' ? raw.orderID : '';
    const emailOverride = isRecord(raw) && typeof raw.emailOverride === 'string' ? raw.emailOverride : null;
    if (!orderID) return NextResponse.json({ error: 'INVALID_ORDER_ID' }, { status: 400 });

    const capture = (await captureOrder(orderID)) as PaypalCapture;
    console.log('PAYPAL_CAPTURE', JSON.stringify(capture));

    // Pull a real address (override for sandbox), then fall back to env
    const toEmail =
      emailOverride ||
      capture.payer?.email_address ||
      capture.payment_source?.paypal?.email_address ||
      process.env.ORDER_TO_EMAIL || // <-- matches your email.ts
      'orders@kamikulture.com';

    // IMPORTANT: await the email send
    await emailOrderJSON(`Kami Kulture Order ${orderID}`, capture, { to: toEmail });

    return NextResponse.json({ ok: true, orderID, capture }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('/api/paypal/capture-order', message);
    return NextResponse.json({ error: 'CAPTURE_FAILED' }, { status: 500 });
  }
}
