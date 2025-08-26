// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const runtime = 'nodejs'; // Buffer is Node-only

/** ---- Basic Auth (supports both env name styles) ---- */
function checkBasicAuth(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Basic ')) return false;
  const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString();
  const [u, p] = decoded.split(':');

  const user = process.env.BASIC_AUTH_USER ?? process.env.ADMIN_USER ?? '';
  const pass = process.env.BASIC_AUTH_PASS ?? process.env.ADMIN_PASS ?? '';

  return !!user && !!pass && u === user && p === pass;
}

function unauthorized() {
  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Orders API (GET)"' },
  });
}

/** ---- GET /api/orders  (admin only) ----
 * Query params:
 *   q=...            (search by id, email, title, slug, sku, size)
 *   sort=...         one of: createdAt_desc (default), amount_desc, amount_asc, status_desc, status_asc
 *   take=number      (optional, defaults to 200, max 500)
 */
export async function GET(req: NextRequest) {
  if (!checkBasicAuth(req)) return unauthorized();

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  const sort = (searchParams.get('sort') ?? 'createdAt_desc').toLowerCase();
  const takeParam = Number(searchParams.get('take') ?? 200);
  const take = Number.isFinite(takeParam) ? Math.max(1, Math.min(500, takeParam)) : 200;

  // Explicit Prisma types fix the squiggles
  const orderBy: Prisma.OrderOrderByWithRelationInput =
    sort === 'amount_desc' ? { amountTotal: 'desc' } :
    sort === 'amount_asc'  ? { amountTotal: 'asc' }  :
    sort === 'status_asc'  ? { status: 'asc' }       :
    sort === 'status_desc' ? { status: 'desc' }      :
                             { createdAt: 'desc' };

  const where: Prisma.OrderWhereInput = q
    ? {
        OR: [
          { id:           { contains: q, mode: 'insensitive' } },
          { payerEmail:   { contains: q, mode: 'insensitive' } },
          { productTitle: { contains: q, mode: 'insensitive' } },
          { productSlug:  { contains: q, mode: 'insensitive' } },
          { sku:          { contains: q, mode: 'insensitive' } },
          { selectedSize: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};

  const data = await prisma.order.findMany({
    where,
    orderBy,
    take,
  });

  return NextResponse.json({ data });
}

/** ---- POST /api/orders  (no longer used; capture writes to DB) ---- */
export async function POST() {
  return NextResponse.json(
    { ok: false, error: 'Use /api/paypal/capture-order to create/update orders.' },
    { status: 405 },
  );
}
