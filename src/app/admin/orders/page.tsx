// /src/app/admin/orders/page.tsx
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import Link from 'next/link';

/** Build sort link with current query */
function sortHref(base: { q: string; sort: string }, key: string) {
  const qs = new URLSearchParams();
  if (base.q) qs.set('q', base.q);
  qs.set('sort', key);
  return `?${qs.toString()}`;
}

/** Prisma.Decimal -> number */
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

export default async function AdminOrders({
  searchParams,
}: {
  // Keeping your existing Promise style to avoid breaking changes in your app version
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const qRaw = sp.q;
  const sortRaw = sp.sort;

  const q = (Array.isArray(qRaw) ? qRaw[0] : qRaw) ?? '';
  const sort = ((Array.isArray(sortRaw) ? sortRaw[0] : sortRaw) ?? 'createdAt_desc').toLowerCase();

  const orderBy: Prisma.OrderOrderByWithRelationInput =
    sort === 'amount_desc' ? { amountTotal: 'desc' } :
    sort === 'amount_asc'  ? { amountTotal: 'asc' }  :
    sort === 'status_asc'  ? { status: 'asc' }       :
    sort === 'status_desc' ? { status: 'desc' }      :
                             { createdAt: 'desc' };

  // Search legacy fields + items[] + NEW shipping snapshot fields
  const where: Prisma.OrderWhereInput = q
    ? {
        OR: [
          { id:           { contains: q } },
          { payerEmail:   { contains: q } },
          { buyerEmail:   { contains: q } },
          { productTitle: { contains: q } },
          { productSlug:  { contains: q } },
          { sku:          { contains: q } },
          { selectedSize: { contains: q } },
          // NEW: shipping/customer snapshot fields
          { shipFirstName:  { contains: q } },
          { shipLastName:   { contains: q } },
          { shipEmail:      { contains: q } },
          { shipPhone:      { contains: q } },
          { shipAddress1:   { contains: q } },
          { shipAddress2:   { contains: q } },
          { shipCity:       { contains: q } },
          { shipState:      { contains: q } },
          { shipPostalCode: { contains: q } },
          { shipCountry:    { contains: q } },
          {
            items: {
              some: {
                OR: [
                  { title: { contains: q } },
                  { sku:   { contains: q } },
                  { size:  { contains: q } },
                ],
              },
            },
          },
        ],
      }
    : {};

  const orders = await prisma.order.findMany({
    where,
    orderBy,
    take: 200,
    include: {
      items: { select: { title: true, sku: true, size: true, qty: true } },
    },
  });

  const baseQS = { q, sort };

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>

        <div className="flex items-center gap-2">
          <a
            href="/api/orders?format=csv"
            className="text-sm rounded border border-white/20 px-3 py-1 hover:bg-white/5"
            rel="noopener"
          >
            Export CSV
          </a>

          {/* Sign out clears the admin cookie and returns home */}
          <Link
            href="/admin/sign-out?next=/"
            className="text-sm rounded border border-white/20 px-3 py-1 hover:bg-white/5"
          >
            Sign out
          </Link>
        </div>
      </div>

      {/* Search box — force readable text on dark theme */}
      <form className="mb-4">
        <input
          name="q"
          defaultValue={q}  // fixed: removed accidental "app"
          placeholder="Search id, email, title, SKU, customer name, city…"
          autoComplete="off"
          className="w-full md:w-96 rounded border border-white/20 bg-white px-3 py-2
                     text-black placeholder:text-neutral-500 caret-black"
          style={{ color: '#000', WebkitTextFillColor: '#000' }}
        />
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">
                <Link href={sortHref(baseQS, 'createdAt_desc')}>Created</Link>
              </th>
              <th className="py-2 pr-4">
                <Link href={sortHref(baseQS, 'amount_desc')}>Amount</Link>
              </th>
              <th className="py-2 pr-4">
                <Link href={sortHref(baseQS, 'status_desc')}>Status</Link>
              </th>
              <th className="py-2 pr-4">Order ID</th>
              <th className="py-2 pr-4">Customer</th>    {/* NEW */}
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Ship to</th>     {/* NEW */}
              <th className="py-2 pr-4">Item(s)</th>
              <th className="py-2 pr-4">SKU/Size</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o, idx) => {
              const amountNum = toNumber(o.amountTotal);

              const name =
                (o.shipFirstName || o.shipLastName)
                  ? `${o.shipFirstName ?? ''} ${o.shipLastName ?? ''}`.trim()
                  : (o.payerName ?? '—');

              const email = o.shipEmail ?? o.payerEmail ?? o.buyerEmail ?? '—';

              const shipLine =
                [o.shipCity, o.shipState, o.shipPostalCode, o.shipCountry]
                  .filter(Boolean)
                  .join(', ') || '—';

              const first = o.items[0];
              const extra = o.items.length > 1 ? ` +${o.items.length - 1} more` : '';
              const itemLabel =
                first
                  ? `${first.title} x${first.qty}${extra}`
                  : (o.productTitle ?? '—');

              const skuSize =
                first
                  ? `${first.sku ?? '—'}${first.size ? ` / ${first.size}` : ''}${extra ? ' (multiple)' : ''}`
                  : `${o.sku ?? '—'}${o.selectedSize ? ` / ${o.selectedSize}` : ''}`;

              return (
                <tr key={o.id} className="border-b">
                  <td className="py-2 pr-4">{idx + 1}</td>
                  <td className="py-2 pr-4">
                    {o.createdAt.toISOString().slice(0, 19).replace('T', ' ')}
                  </td>
                  <td className="py-2 pr-4">
                    {o.currency ?? 'USD'} {amountNum.toFixed(2)}
                  </td>
                  <td className="py-2 pr-4">{o.status}</td>
                  <td className="py-2 pr-4 font-mono">{o.id}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{name}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{email}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{shipLine}</td>
                  <td className="py-2 pr-4">{itemLabel}</td>
                  <td className="py-2 pr-4">{skuSize}</td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={10} className="py-6 text-center text-neutral-500">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
