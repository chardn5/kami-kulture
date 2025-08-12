// app/api/paypal/create-order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/paypal';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as unknown;
    const { product, qty } = ((): { product: 'kami-tee'; qty: number } => {
      if (typeof body === 'object' && body !== null && (body as any).product === 'kami-tee') {
        const q = Number((body as any).qty ?? 1);
        return { product: 'kami-tee', qty: Number.isFinite(q) && q > 0 ? q : 1 };
      }
      return { product: 'kami-tee', qty: 1 };
    })();
    const order = await createOrder(product, qty);
    return NextResponse.json({ id: order.id, status: order.status }, { status: 200 });
  } catch (err) {
    console.error('/api/paypal/create-order', err);
    return NextResponse.json({ error: 'CREATE_FAILED' }, { status: 500 });
  }
}
