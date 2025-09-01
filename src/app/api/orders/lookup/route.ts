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
  const orderID = (body.orderID ?? '').trim();
  const email = (body.email ?? '').trim();

  if (!orderID || !email) {
    return NextResponse.json({ error: 'orderID and email required' }, { status: 400 });
  }

  // Broader match: payerEmail OR buyerEmail OR related Customer.email (case-insensitive)
  const order = await prisma.order.findFirst({
    where: {
      id: orderID,
      OR: [
        { payerEmail: { equals: email, mode: 'insensitive' } },
        { buyerEmail: { equals: email, mode: 'insensitive' } },
        { customer: { is: { email: { equals: email, mode: 'insensitive' } } } },
      ],
    },
    select: {
      status: true,
      amountTotal: true,
      currency: true,
      createdAt: true,
      productTitle: true,
      selectedSize: true,
      sku: true,
    },
  });

  if (!order) {
    return NextResponse.json({ found: false }, { status: 200 });
  }

  // Prisma Decimal -> string
  const amountTotal =
    typeof (order.amountTotal as unknown as { toString?: () => string }).toString === 'function'
      ? (order.amountTotal as unknown as { toString: () => string }).toString()
      : String(order.amountTotal);

  return NextResponse.json({
    found: true,
    status: order.status,
    amountTotal,
    currency: order.currency,
    createdAt: order.createdAt,
    productTitle: order.productTitle,
    selectedSize: order.selectedSize,
    sku: order.sku,
  });
}
