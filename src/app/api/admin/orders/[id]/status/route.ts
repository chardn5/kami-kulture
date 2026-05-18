import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { isOrderStatus } from '@/lib/orderStatus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function decodeBasicAuth(h: string) {
  if (!h?.startsWith('Basic ')) return null;
  try {
    const decoded = Buffer.from(h.split(' ')[1] || '', 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator === -1) return null;
    return { user: decoded.slice(0, separator), pass: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
}

async function hasAdminAccess(req: NextRequest) {
  const cookieStore = await cookies();
  const adminOk = cookieStore.get('admin_ok')?.value === '1';
  if (!adminOk) return false;

  const user = process.env.BASIC_AUTH_USER || process.env.ADMIN_USER || '';
  const pass = process.env.BASIC_AUTH_PASS || process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || '';
  const authHeader = req.headers.get('authorization') ?? '';
  const creds = decodeBasicAuth(authHeader);

  return !!user && !!pass && !!creds && creds.user === user && creds.pass === pass;
}

type Body = {
  status?: string;
};

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await hasAdminAccess(req))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const orderId = decodeURIComponent(id || '').trim();
  if (!orderId) {
    return NextResponse.json({ ok: false, error: 'Order ID required' }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const status = String(body.status ?? '').trim().toUpperCase();

  if (!isOrderStatus(status)) {
    return NextResponse.json({ ok: false, error: 'Unsupported status' }, { status: 400 });
  }

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      seq: true,
      status: true,
      fulfilledAt: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  }

  const shouldMarkFulfilled = (status === 'SHIPPED' || status === 'DELIVERED') && !existing.fulfilledAt;

  const updated = await prisma.order.update({
    where: { seq: existing.seq },
    data: {
      status,
      ...(shouldMarkFulfilled ? { fulfilledAt: new Date() } : {}),
    },
    select: {
      id: true,
      status: true,
      fulfilledAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    order: {
      id: updated.id,
      status: updated.status,
      fulfilledAt: updated.fulfilledAt?.toISOString() ?? null,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
