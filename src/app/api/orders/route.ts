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
      { buyerEmail: { contains: q } },
      { productTitle: { contains: q } },
      { productSlug: { contains: q } },
      { sku: { contains: q } },
      { selectedSize: { contains: q } },
      { shipFirstName: { contains: q } },
      { shipLastName: { contains: q } },
      { shipEmail: { contains: q } },
      { shipPhone: { contains: q } },
      { shipAddress1: { contains: q } },
      { shipAddress2: { contains: q } },
      { shipCity: { contains: q } },
      { shipState: { contains: q } },
      { shipPostalCode: { contains: q } },
      { shipCountry: { contains: q } },
      { printifyOrderId: { contains: q } },
      { printifyStatus: { contains: q } },
      { printifyLastError: { contains: q } },
      { trackingCarrier: { contains: q } },
      { trackingNumber: { contains: q } },
      { trackingUrl: { contains: q } },
      {
        items: {
          some: {
            OR: [
              { sku: { contains: q } },
              { title: { contains: q } },
              { size: { contains: q } },
              { color: { contains: q } },
              { printifyProductId: { contains: q } },
            ],
          },
        },
      },
    ],
  } : {};

  const rows = await prisma.order.findMany({
    where,
    orderBy,
    take,
    select: {
      id: true,
      createdAt: true,
      fulfilledAt: true,
      status: true,
      amountTotal: true,
      amountSubtotal: true,
      amountShipping: true,
      amountTax: true,
      currency: true,
      payerEmail: true,
      payerName: true,
      buyerEmail: true,
      captureId: true,
      shipFirstName: true,
      shipLastName: true,
      shipEmail: true,
      shipPhone: true,
      shipAddress1: true,
      shipAddress2: true,
      shipCity: true,
      shipState: true,
      shipPostalCode: true,
      shipCountry: true,
      productTitle: true,
      productSlug: true,
      selectedSize: true,
      sku: true,
      printifyOrderId: true,
      printifyStatus: true,
      printifySubmittedAt: true,
      printifyLastError: true,
      printifyCostSubtotal: true,
      printifyCostShipping: true,
      printifyCostTax: true,
      printifyCostTotal: true,
      estimatedPaymentFee: true,
      estimatedProfit: true,
      trackingCarrier: true,
      trackingNumber: true,
      trackingUrl: true,
      shippedAt: true,
      deliveredAt: true,
      items: {
        select: {
          title: true,
          qty: true,
          sku: true,
          size: true,
          color: true,
          unitPrice: true,
          printifyProductId: true,
          printifyVariantId: true,
        },
      },
    },
  });

 // ---- helpers: typed guard, no `any` ----
type Stringable = { toString: () => string };
const isStringable = (v: unknown): v is Stringable =>
  typeof v === 'object' && v !== null && 'toString' in (v as Record<string, unknown>) &&
  typeof (v as { toString: unknown }).toString === 'function';

// Normalize Decimal/BigInt for JSON (no `any`)
const decimalString = (value: unknown) => isStringable(value) ? value.toString() : value == null ? '' : String(value);
const data = rows.map((r) => {
  const customerName =
    (r.shipFirstName || r.shipLastName)
      ? `${r.shipFirstName ?? ''} ${r.shipLastName ?? ''}`.trim()
      : (r.payerName ?? '');
  const email = r.shipEmail ?? r.payerEmail ?? r.buyerEmail ?? '';
  const shipTo = [
    r.shipAddress1,
    r.shipAddress2,
    [r.shipCity, r.shipState, r.shipPostalCode].filter(Boolean).join(', '),
    r.shipCountry,
  ].filter(Boolean).join(' | ');

  return {
    ...r,
    amountTotal: decimalString(r.amountTotal),
    amountSubtotal: decimalString(r.amountSubtotal),
    amountShipping: decimalString(r.amountShipping),
    amountTax: decimalString(r.amountTax),
    customerName,
    email,
    shipTo,
    itemSummary: r.items.map((item) => {
      const options = [item.color, item.size].filter(Boolean).join(' / ');
      const suffix = options ? ` / ${options}` : '';
      return `${item.title} x${item.qty}${suffix}`;
    }).join('; '),
    skuSummary: r.items.map((item) => {
      const variant = item.printifyVariantId ? `variant:${item.printifyVariantId}` : '';
      return [item.sku, variant, item.printifyProductId].filter(Boolean).join(' / ');
    }).join('; '),
    printifySubmittedAt: r.printifySubmittedAt instanceof Date ? r.printifySubmittedAt.toISOString() : '',
    printifyCostSubtotal: decimalString(r.printifyCostSubtotal),
    printifyCostShipping: decimalString(r.printifyCostShipping),
    printifyCostTax: decimalString(r.printifyCostTax),
    printifyCostTotal: decimalString(r.printifyCostTotal),
    estimatedPaymentFee: decimalString(r.estimatedPaymentFee),
    estimatedProfit: decimalString(r.estimatedProfit),
    shippedAt: r.shippedAt instanceof Date ? r.shippedAt.toISOString() : '',
    deliveredAt: r.deliveredAt instanceof Date ? r.deliveredAt.toISOString() : '',
  };
});


  // ---- CSV / JSON formats ----
const format = searchParams.get('format');
const pretty = searchParams.has('pretty');

if (format === 'csv') {
  const header = [
    'id','createdAt','fulfilledAt','status','amountSubtotal','amountShipping','amountTax','amountTotal','currency',
    'customerName','email','phone','shipTo','items','skus','captureId','printifyOrderId','printifyStatus','printifySubmittedAt','printifyLastError',
    'printifyCostSubtotal','printifyCostShipping','printifyCostTax','printifyCostTotal','estimatedPaymentFee','estimatedProfit',
    'trackingCarrier','trackingNumber','trackingUrl','shippedAt','deliveredAt',
  ].join(',');

  const lines = data.map((row) => [
    row.id,
    row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    row.fulfilledAt instanceof Date ? row.fulfilledAt.toISOString() : '',
    row.status,
    row.amountSubtotal,
    row.amountShipping,
    row.amountTax,
    row.amountTotal,
    row.currency,
    row.customerName,
    row.email,
    row.shipPhone ?? '',
    row.shipTo,
    row.itemSummary || row.productTitle || '',
    row.skuSummary || row.sku || '',
    row.captureId ?? '',
    row.printifyOrderId ?? '',
    row.printifyStatus ?? '',
    row.printifySubmittedAt,
    row.printifyLastError ?? '',
    row.printifyCostSubtotal,
    row.printifyCostShipping,
    row.printifyCostTax,
    row.printifyCostTotal,
    row.estimatedPaymentFee,
    row.estimatedProfit,
    row.trackingCarrier ?? '',
    row.trackingNumber ?? '',
    row.trackingUrl ?? '',
    row.shippedAt,
    row.deliveredAt,
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
    { ok: false, error: 'Use POST /api/orders/capture to create orders.' },
    { status: 405 },
  );
}
