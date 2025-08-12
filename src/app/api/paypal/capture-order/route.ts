import { NextRequest, NextResponse } from 'next/server';
import { captureOrder } from '@/lib/paypal';
import { emailOrderJSON } from '@/lib/email';

export const runtime = 'nodejs';

type PaypalCapture = {
  payer?: { email_address?: string };
  payment_source?: { paypal?: { email_address?: string } };
  status?: string;
} & Record<string, unknown>; // <- not `any`

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function getPayerEmail(capture: unknown): string | null {
  if (!isRecord(capture)) return null;
  const c = capture as PaypalCapture;
  return (
    c.payer?.email_address ??
    c.payment_source?.paypal?.email_address ??
    null
  );
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const orderID = isRecord(raw) && typeof raw.orderID === 'string' ? raw.orderID : '';
    const emailOverride = isRecord(raw) && typeof raw.emailOverride === 'string' ? raw.emailOverride : null;
    if (!orderID) return NextResponse.json({ error: 'INVALID_ORDER_ID' }, { status: 400 });

    const capture = (await captureOrder(orderID)) as unknown; // keep as unknown
    console.log('PAYPAL_CAPTURE', JSON.stringify(capture));

    const toEmail =
      emailOverride ||
      getPayerEmail(capture) ||
      process.env.ORDER_TO_EMAIL ||
      'orders@kamikulture.com';

    await emailOrderJSON(`Kami Kulture Order ${orderID}`, capture, { to: toEmail });

    return NextResponse.json({ ok: true, orderID }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('/api/paypal/capture-order', message);
    return NextResponse.json({ error: 'CAPTURE_FAILED' }, { status: 500 });
  }
}
