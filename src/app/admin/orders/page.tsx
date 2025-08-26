// /src/app/admin/orders/page.tsx
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import Link from 'next/link';

/** Infer the row type directly from Prisma */
type OrderRow = Awaited<ReturnType<typeof prisma.order.findMany>>[number];

function sortHref(base: { q: string; sort: string }, key: string) {
  const qs = new URLSearchParams();
  if (base.q) qs.set('q', base.q);
  qs.set('sort', key);
  return `?${qs.toString()}`;
}

/** Type guard for Prisma.Decimal (no `any`) */
function isPrismaDecimal(v: unknown): v is Prisma.Decimal {
  return typeof v === 'object' && v !== null && typeof (v as Prisma.Decimal).toNumber === 'function';
}
/** Convert Prisma.Decimal | number | string -> number */
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

  const where: Prisma.OrderWhereInput = q
    ? {
        OR: [
          { id:           { contains: q, /* mode: 'insensitive' */ } },
          { payerEmail:   { contains: q } },
          { productTitle: { contains: q } },
          { productSlug:  { contains: q } },
          { sku:          { contains: q } },
          { selectedSize: { contains: q } },
        ],
      }
    : {};

  const orders = await prisma.order.findMany({ where, orderBy, take: 200 });
  const baseQS = { q, sort };

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-center justify-between">
  <h1 className="text-2xl font-semibold">Orders</h1>

  <div className="flex items-center gap-2">
    {/* Optional: quick export */}
    <Link
      href="/api/orders?format=csv"
      className="text-sm rounded border border-white/20 px-3 py-1 hover:bg-white/5"
    >
      Export CSV
    </Link>

    {/* Sign out clears the admin cookie and returns home */}
    <Link
      href="/admin/sign-out?next=/"
      className="text-sm rounded border border-white/20 px-3 py-1 hover:bg-white/5"
    >
      Sign out
    </Link>
  </div>
</div>

      <form className="mb-4">
        <input
          className="w-full rounded border px-3 py-2 md:w-80"
          name="q"
          defaultValue={q}
          placeholder="Search id, email, title, SKU…"
        />
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4"><Link href={sortHref(baseQS, 'createdAt_desc')}>Created</Link></th>
              <th className="py-2 pr-4"><Link href={sortHref(baseQS, 'amount_desc')}>Amount</Link></th>
              <th className="py-2 pr-4"><Link href={sortHref(baseQS, 'status_desc')}>Status</Link></th>
              <th className="py-2 pr-4">Order ID</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Item</th>
              <th className="py-2 pr-4">SKU/Size</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o: OrderRow, idx: number) => (
              <tr key={o.id} className="border-b">
                <td className="py-2 pr-4">{idx + 1}</td>
                <td className="py-2 pr-4">{o.createdAt.toISOString().slice(0, 19).replace('T', ' ')}</td>
                <td className="py-2 pr-4">{o.currency} {toNumber(o.amountTotal).toFixed(2)}</td>
                <td className="py-2 pr-4">{o.status}</td>
                <td className="py-2 pr-4 font-mono">{o.id}</td>
                <td className="py-2 pr-4">{o.payerEmail ?? '—'}</td>
                <td className="py-2 pr-4">{o.productTitle ?? '—'}</td>
                <td className="py-2 pr-4">{o.sku ?? '—'}{o.selectedSize ? ` / ${o.selectedSize}` : ''}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={8} className="py-6 text-center text-gray-500">No orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
