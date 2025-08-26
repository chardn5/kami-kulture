// /src/app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const runtime = 'nodejs';

/** ---- Basic Auth ---- */
function checkBasicAuth(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Basic ')) return false;
  const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString();
  const [u, p] = decoded.split(':');

  // use || so empty BASIC_* fall back to ADMIN_* (and support ADMIN_PASSWORD)
  const user = process.env.BASIC_AUTH_USER || process.env.ADMIN_USER || '';
  const pass = process.env.BASIC_AUTH_PASS || process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || '';

  return !!user && !!pass && u === user && p === pass;
}

function unauthorized() {
  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Orders API (GET)"' },
  });
}

export async function GET(req: NextRequest) {
  if (!checkBasicAuth(req)) return unauthorized();

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  const sort = (searchParams.get('sort') ?? 'createdAt_desc').toLowerCase();
  const takeParam = Number(searchParams.get('take') ?? 200);
  const take = Number.isFinite(takeParam) ? Math.max(1, Math.min(500, takeParam)) : 200;

  const orderBy: Prisma.OrderOrderByWithRelationInput =
    sort === 'amount_desc' ? { amountTotal: 'desc' } :
    sort === 'amount_asc'  ? { amountTotal: 'asc' }  :
    sort === 'status_asc'  ? { status: 'asc' }       :
    sort === 'status_desc' ? { status: 'desc' }      :
                             { createdAt: 'desc' };

  const where: Prisma.OrderWhereInput = q
    ? {
        OR: [
          { id:           { contains: q } },
          { payerEmail:   { contains: q } },
          { productTitle: { contains: q } },
          { productSlug:  { contains: q } },
          { sku:          { contains: q } },
          { selectedSize: { contains: q } },
        ],
      }
    : {};

  // Exclude BigInt 'seq' from the selection (or convert to string below if you need it)
  const rows = await prisma.order.findMany({
    where,
    orderBy,
    take,
    select: {
      // seq: true, // include only if you convert it to string below
      id: true,
      createdAt: true,
      status: true,
      amountTotal: true,
      currency: true,
      payerEmail: true,
      productTitle: true,
      productSlug: true,
      selectedSize: true,
      sku: true,
    },
  });

  // Normalize Decimal/BigInt for JSON
  const data = rows.map((r) => ({
    ...r,
    // If you decided to select seq above: seq: (r as any).seq?.toString(),
    amountTotal:
      typeof (r.amountTotal as unknown as { toString?: () => string }).toString === 'function'
        ? (r.amountTotal as unknown as { toString: () => string }).toString()
        : String(r.amountTotal),
  }));

  return NextResponse.json({ data }, { headers: { 'cache-control': 'no-store' } });
}

export async function POST() {
  return NextResponse.json(
    { ok: false, error: 'Use /api/paypal/capture-order to create/update orders.' },
    { status: 405 },
  );
}
