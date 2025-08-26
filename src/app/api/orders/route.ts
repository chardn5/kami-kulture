// /src/app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

/** ---- Basic Auth ---- */
function checkBasicAuth(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Basic ')) return false;
  const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString();
  const [u, p] = decoded.split(':');

  const user = process.env.BASIC_AUTH_USER || process.env.ADMIN_USER || '';
  const pass = process.env.BASIC_AUTH_PASS || process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || '';
  return !!user && !!pass && u === user && p === pass;
}

// Make unauthorized() pure; pass realm in
function unauthorized(realm: string) {
  return new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${realm}"`,
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(req: NextRequest) {
  // cookies() is async in your version
  const cookieStore = await cookies();
  const realm = cookieStore.get('admin_realm')?.value || 'Admin Area';

  if (!checkBasicAuth(req)) return unauthorized(realm);

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

  const where: Prisma.OrderWhereInput = q ? {
    OR: [
      { id: { contains: q } },
      { payerEmail: { contains: q } },
      { productTitle: { contains: q } },
      { productSlug: { contains: q } },
      { sku: { contains: q } },
      { selectedSize: { contains: q } },
    ],
  } : {};

  const rows = await prisma.order.findMany({
    where,
    orderBy,
    take,
    select: {
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

 // ---- helpers: typed guard, no `any` ----
type Stringable = { toString: () => string };
const isStringable = (v: unknown): v is Stringable =>
  typeof v === 'object' && v !== null && 'toString' in (v as Record<string, unknown>) &&
  typeof (v as { toString: unknown }).toString === 'function';

// Normalize Decimal/BigInt for JSON (no `any`)
const data = rows.map((r) => ({
  ...r,
  amountTotal: isStringable(r.amountTotal) ? r.amountTotal.toString() : String(r.amountTotal),
}));


  // ---- CSV / JSON formats ----
const format = searchParams.get('format');
const pretty = searchParams.has('pretty');

if (format === 'csv') {
  const header = [
    'id','createdAt','status','amountTotal','currency',
    'payerEmail','productTitle','productSlug','selectedSize','sku',
  ].join(',');

  const lines = data.map((row) => [
    row.id,
    row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    row.status,
    row.amountTotal,
    row.currency,
    row.payerEmail ?? '',
    row.productTitle ?? '',
    row.productSlug ?? '',
    row.selectedSize ?? '',
    row.sku ?? '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));


  const csv = [header, ...lines].join('\n');
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="orders.csv"',
      'cache-control': 'no-store',
    },
  });
}

// Default JSON (pretty if ?pretty=1)
return new Response(JSON.stringify({ data }, null, pretty ? 2 : 0), {
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  },
});
}

export async function POST() {
  return NextResponse.json(
    { ok: false, error: 'Use /api/paypal/capture-order to create/update orders.' },
    { status: 405 },
  );
}
