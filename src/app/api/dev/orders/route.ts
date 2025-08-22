import { NextResponse } from 'next/server';
import { readOrders } from '@/lib/ordersLog';

export async function GET() {
  const orders = await readOrders();
  return NextResponse.json({ ok: true, orders });
}
