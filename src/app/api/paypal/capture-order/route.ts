import { NextRequest, NextResponse } from 'next/server';
import { captureOrder } from '@/lib/paypal';
import { emailOrderJSON } from '@/lib/email';

export const runtime = 'nodejs';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

async function getOrderID(req: NextRequest): Promise<string> {
  try {
    const raw: unknown = await req.json();
    if (isRecord(raw) && typeof raw['orderID'] === 'string') return raw['orderID'];
    return '';
  } catch {
    return '';
  }
}

export async function POST(req: NextRequest) {
  try {
    const orderID = await getOrderID(req);
    if (!orderID) return NextResponse.json({ error: 'INVALID_ORDER_ID' }, { status: 400 });

    const capture = await captureOrder(orderID);

    console.log('PAYPAL_CAPTURE', JSON.stringify(capture));
    void emailOrderJSON(`Kami Kulture Order ${orderID}`, capture);

    return NextResponse.json({ ok: true, orderID, capture }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('/api/paypal/capture-order', message);
    return NextResponse.json({ error: 'CAPTURE_FAILED' }, { status: 500 });
  }
}
