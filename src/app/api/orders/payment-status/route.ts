import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';
import { paypalEnvironment } from '@/lib/paypalServer';

export const runtime = 'nodejs';
const schema = z.object({ paypalOrderId: z.string().regex(/^[A-Z0-9]{10,32}$/), email: z.string().trim().email().max(254) });
const headers = { 'Cache-Control': 'no-store' };

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(`payment-status:${ip}`, 60, 60_000).ok)
    return NextResponse.json({ confirmed: false }, { status: 429, headers });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ confirmed: false }, { status: 400, headers });
  try {
    const order = await prisma.order.findUnique({
      where: { paypalOrderId: parsed.data.paypalOrderId },
      select: { id: true, status: true, captureId: true, paidAt: true, raw: true, buyerEmail: true, shipEmail: true },
    });
    const raw = order?.raw as { checkout?: { environment?: string } } | null;
    const emailMatches = [order?.buyerEmail, order?.shipEmail].some(email => email?.trim().toLowerCase() === parsed.data.email.toLowerCase());
    if (!order || !emailMatches || raw?.checkout?.environment !== paypalEnvironment())
      return NextResponse.json({ confirmed: false }, { status: 404, headers });
    const confirmed = Boolean(order.captureId && order.paidAt && order.status !== 'PENDING_PAYMENT');
    return NextResponse.json({ confirmed, ...(confirmed ? { orderId: order.id } : {}) }, { headers });
  } catch {
    console.error('[checkout] payment status temporarily unavailable');
    return NextResponse.json({ confirmed: false }, { status: 503, headers });
  }
}
