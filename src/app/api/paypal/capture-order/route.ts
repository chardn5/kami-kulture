// app/api/paypal/capture-order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { captureOrder } from '@/lib/paypal';
import { emailOrderJSON } from '@/lib/email';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as unknown;
    const orderID =
      typeof body === 'object' && body !== null && typeof (body as any).orderID === 'string'
        ? (body as any).orderID
        : '';

    if (!orderID) return NextResponse.json({ error: 'INVALID_ORDER_ID' }, { status: 400 });

    const capture = await captureOrder(orderID);

    console.log('PAYPAL_CAPTURE', JSON.stringify(capture));
    void emailOrderJSON(`Kami Kulture Order ${orderID}`, capture);

    return NextResponse.json({ ok: true, orderID, capture }, { status: 200 });
  } catch (err) {
    console.error('/api/paypal/capture-order', err);
    return NextResponse.json({ error: 'CAPTURE_FAILED' }, { status: 500 });
  }
}

