import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/paypal';

export const runtime = 'nodejs';

type CreateBody = { product: 'kami-tee'; qty?: number };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

async function parseCreateBody(req: NextRequest): Promise<CreateBody> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { product: 'kami-tee', qty: 1 };
  }
  if (!isRecord(raw)) return { product: 'kami-tee', qty: 1 };

  const product = raw['product'] === 'kami-tee' ? 'kami-tee' : 'kami-tee';
  const qtyNum =
    typeof raw['qty'] === 'number'
      ? raw['qty']
      : typeof raw['qty'] === 'string'
      ? Number(raw['qty'])
      : 1;

  return { product, qty: Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 1 };
}

export async function POST(req: NextRequest) {
  try {
    const { product, qty } = await parseCreateBody(req);
    const order = await createOrder(product, qty ?? 1);
    return NextResponse.json({ id: order.id, status: order.status }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('/api/paypal/create-order', message);
    return NextResponse.json({ error: 'CREATE_FAILED' }, { status: 500 });
  }
}
