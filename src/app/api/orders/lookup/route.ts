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

function decimalToString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'number') return value.toFixed(2);
  if (typeof value === 'string') return value;
  if (typeof (value as { toString?: () => string }).toString === 'function') {
    return (value as { toString: () => string }).toString();
  }
  return String(value);
}

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

  // Broader match: payerEmail OR buyerEmail OR shipEmail OR related Customer.email (case-insensitive)
  const order = await prisma.order.findFirst({
    where: {
      id: orderID,
      OR: [
        { payerEmail: { equals: email, mode: 'insensitive' } },
        { buyerEmail: { equals: email, mode: 'insensitive' } },
        { shipEmail: { equals: email, mode: 'insensitive' } },
        { customer: { is: { email: { equals: email, mode: 'insensitive' } } } },
      ],
    },
    select: {
      status: true,
      amountTotal: true,
      amountSubtotal: true,
      amountShipping: true,
      amountTax: true,
      currency: true,
      createdAt: true,
      fulfilledAt: true,
      productTitle: true,
      selectedSize: true,
      sku: true,
      shipCity: true,
      shipState: true,
      shipCountry: true,
      items: {
        select: {
          title: true,
          qty: true,
          unitPrice: true,
          size: true,
          color: true,
          sku: true,
          image: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ found: false }, { status: 200 });
  }

  return NextResponse.json({
    found: true,
    status: order.status,
    amountTotal: decimalToString(order.amountTotal),
    amountSubtotal: decimalToString(order.amountSubtotal),
    amountShipping: decimalToString(order.amountShipping),
    amountTax: decimalToString(order.amountTax),
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    fulfilledAt: order.fulfilledAt?.toISOString() ?? null,
    productTitle: order.productTitle,
    selectedSize: order.selectedSize,
    sku: order.sku,
    shipping: {
      city: order.shipCity,
      state: order.shipState,
      country: order.shipCountry,
    },
    items: order.items.map((item) => ({
      title: item.title,
      qty: item.qty,
      unitPrice: decimalToString(item.unitPrice),
      size: item.size,
      color: item.color,
      sku: item.sku,
      image: item.image,
    })),
  });
}
