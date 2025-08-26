// /src/app/api/orders/lookup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'unknown';
}

type LookupBody = { orderID?: string; email?: string };

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  if (!rateLimit(`lookup:${ip}`, 20, 60_000).ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body: LookupBody = await req.json().catch(() => ({}) as LookupBody);
  const orderID = body.orderID ?? '';
  const email = body.email ?? '';

  if (!orderID || !email) {
    return NextResponse.json({ error: 'orderID and email required' }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderID } });

  if (!order || (order.payerEmail?.toLowerCase() ?? '') !== email.toLowerCase()) {
    return NextResponse.json({ found: false }, { status: 200 });
  }

  return NextResponse.json({
    found: true,
    status: order.status,
    amountTotal: String(order.amountTotal),
    currency: order.currency,
    createdAt: order.createdAt,
    productTitle: order.productTitle,
    selectedSize: order.selectedSize,
    sku: order.sku,
  });
}
