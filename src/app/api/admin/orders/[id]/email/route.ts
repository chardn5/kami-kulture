import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hasAdminApiAccess } from '@/lib/adminApiAuth';
import { sendOrderReceipt, sendOrderStatusEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  type?: 'receipt' | 'status';
};

function isPrismaDecimal(v: unknown): v is Prisma.Decimal {
  return typeof v === 'object' && v !== null && typeof (v as Prisma.Decimal).toNumber === 'function';
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (isPrismaDecimal(v)) return v.toNumber();
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function customerName(order: { shipFirstName: string | null; shipLastName: string | null; payerName: string | null }) {
  return (
    order.shipFirstName || order.shipLastName
      ? `${order.shipFirstName ?? ''} ${order.shipLastName ?? ''}`.trim()
      : order.payerName
  ) || undefined;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await hasAdminApiAccess(req))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const orderId = decodeURIComponent(id || '').trim();
  if (!orderId) {
    return NextResponse.json({ ok: false, error: 'Order ID required' }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const type = body.type === 'status' ? 'status' : 'receipt';

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
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
    return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  }

  const to = order.shipEmail ?? order.payerEmail ?? order.buyerEmail;
  if (!to) {
    return NextResponse.json({ ok: false, error: 'No customer email saved for this order.' }, { status: 422 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kamikulture.com';
  const trackUrl = `${siteUrl}/track-order?orderID=${encodeURIComponent(order.id)}&email=${encodeURIComponent(to)}`;
  const items = order.items.map((item) => ({
    title: item.title,
    qty: item.qty,
    unitPrice: toNumber(item.unitPrice),
    size: item.size ?? undefined,
    color: item.color ?? undefined,
    sku: item.sku,
    image: item.image ?? undefined,
  }));

  const result = type === 'receipt'
    ? await sendOrderReceipt({
        to,
        orderNumber: order.id,
        customerName: customerName(order),
        currency: order.currency,
        items,
        subtotal: toNumber(order.amountSubtotal),
        shipping: toNumber(order.amountShipping),
        tax: order.amountTax == null ? undefined : toNumber(order.amountTax),
        total: toNumber(order.amountTotal),
        trackUrl,
      })
    : await sendOrderStatusEmail({
        to,
        orderNumber: order.id,
        customerName: customerName(order),
        currency: order.currency,
        status: order.status,
        printifyStatus: order.printifyStatus,
        items,
        trackingCarrier: order.trackingCarrier ?? undefined,
        trackingNumber: order.trackingNumber ?? undefined,
        trackingUrl: order.trackingUrl ?? undefined,
        trackUrl,
        productionDate: order.printifySubmittedAt?.toISOString(),
        shippedAt: order.shippedAt?.toISOString(),
        deliveredAt: order.deliveredAt?.toISOString(),
      });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: 'Email provider rejected the message.' }, { status: 502 });
  }

  if (type === 'status') {
    await prisma.order.update({
      where: { seq: order.seq },
      data: {
        statusEmailLastStatus: order.status,
        statusEmailSentAt: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true, type, sentTo: to });
}
