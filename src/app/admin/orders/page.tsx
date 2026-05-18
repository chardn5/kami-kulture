// /src/app/admin/orders/page.tsx
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getOrderStatusMeta } from '@/lib/orderStatus';
import OrderStatusControl from './OrderStatusControl';

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

async function requireAdminAccess() {
  const [hdrs, cookieStore] = await Promise.all([headers(), cookies()]);
  const adminOk = cookieStore.get('admin_ok')?.value === '1';

  const user = process.env.BASIC_AUTH_USER || process.env.ADMIN_USER || '';
  const pass = process.env.BASIC_AUTH_PASS || process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || '';
  const creds = decodeBasicAuth(hdrs.get('authorization') ?? '');
  const okAuth = !!user && !!pass && !!creds && creds.user === user && creds.pass === pass;

  if (!(adminOk && okAuth)) {
    redirect('/admin/sign-in?next=/admin/orders');
  }
}

function sortHref(base: { q: string }, key: string) {
  const qs = new URLSearchParams();
  if (base.q) qs.set('q', base.q);
  qs.set('sort', key);
  return `?${qs.toString()}`;
}

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

function money(amount: unknown, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(toNumber(amount));
}

function dateTime(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
}

export default async function AdminOrders({
  searchParams,
}: {
  // Keeping the existing Promise style to avoid breaking changes in this app version.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminAccess();

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
          { id:           { contains: q } },
          { payerEmail:   { contains: q } },
          { buyerEmail:   { contains: q } },
          { productTitle: { contains: q } },
          { productSlug:  { contains: q } },
          { sku:          { contains: q } },
          { selectedSize: { contains: q } },
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
                  { color: { contains: q } },
                  { printifyProductId: { contains: q } },
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
      items: {
        select: {
          title: true,
          sku: true,
          size: true,
          color: true,
          printifyProductId: true,
          printifyVariantId: true,
          qty: true,
          unitPrice: true,
        },
      },
    },
  });

  const revenue = orders.reduce((sum, order) => sum + toNumber(order.amountTotal), 0);
  const paidCount = orders.filter((order) => order.status === 'PAID').length;
  const submittedCount = orders.filter((order) => order.status === 'FULFILLMENT_SUBMITTED').length;
  const failedCount = orders.filter((order) => order.status === 'FULFILLMENT_FAILED').length;
  const currency = orders[0]?.currency ?? 'USD';
  const baseQS = { q };
  const exportQS = new URLSearchParams();
  if (q) exportQS.set('q', q);
  exportQS.set('sort', sort);
  exportQS.set('format', 'csv');

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-[#d6ff57]">Admin</p>
          <h1 className="mt-1 text-3xl font-black">Orders</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#f7f1df]/58">
            Search, review fulfillment status, and export recent order data without fighting a
            cramped table.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/orders?${exportQS.toString()}`}
            className="kk-focus inline-flex h-10 items-center rounded-md border border-[#f7f1df]/18 px-3 text-sm font-semibold hover:bg-[#f7f1df]/8"
            rel="noopener"
          >
            Export CSV
          </a>
          <Link
            href="/admin/sign-out?next=/"
            className="kk-focus inline-flex h-10 items-center rounded-md border border-[#f7f1df]/18 px-3 text-sm font-semibold hover:bg-[#f7f1df]/8"
          >
            Sign out
          </Link>
        </div>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Orders shown', orders.length.toString()],
          ['Revenue shown', money(revenue, currency)],
          ['Paid', paidCount.toString()],
          ['Submitted / failed', `${submittedCount} / ${failedCount}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-4">
            <p className="text-xs font-black uppercase text-[#f7f1df]/44">{label}</p>
            <p className="mt-2 text-2xl font-black text-[#f7f1df]">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-4">
        <form className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search id, email, title, SKU, customer name, city..."
            autoComplete="off"
            className="h-11 w-full rounded-md border border-[#f7f1df]/18 bg-[#0f0f0c] px-3 text-[#f7f1df] placeholder:text-[#f7f1df]/42 caret-[#f7f1df]"
          />
          <button
            className="kk-focus inline-flex h-11 items-center justify-center rounded-md bg-[#f7f1df] px-4 text-sm font-black text-black hover:bg-[#d6ff57]"
            type="submit"
          >
            Search
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[#f7f1df]/52">Sort</span>
          {[
            ['createdAt_desc', 'Newest'],
            ['amount_desc', 'Highest amount'],
            ['amount_asc', 'Lowest amount'],
            ['status_desc', 'Status'],
          ].map(([key, label]) => {
            const active = sort === key.toLowerCase() || (key === 'createdAt_desc' && sort === 'createdat_desc');
            return (
              <Link
                key={key}
                href={sortHref(baseQS, key)}
                className={`kk-focus rounded-md border px-3 py-1.5 font-semibold ${
                  active
                    ? 'border-[#d6ff57] bg-[#d6ff57] text-black'
                    : 'border-[#f7f1df]/16 text-[#f7f1df] hover:bg-[#f7f1df]/8'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-5 space-y-3">
        {orders.map((order, idx) => {
          const statusMeta = getOrderStatusMeta(order.status);
          const name =
            (order.shipFirstName || order.shipLastName)
              ? `${order.shipFirstName ?? ''} ${order.shipLastName ?? ''}`.trim()
              : (order.payerName ?? 'Unknown customer');
          const email = order.shipEmail ?? order.payerEmail ?? order.buyerEmail ?? '';
          const addressParts: string[] = [];
          if (order.shipAddress1) addressParts.push(order.shipAddress1);
          if (order.shipAddress2) addressParts.push(order.shipAddress2);
          const cityStateZip = [order.shipCity, order.shipState, order.shipPostalCode].filter(Boolean).join(', ');
          if (cityStateZip) addressParts.push(cityStateZip);
          if (order.shipCountry) addressParts.push(order.shipCountry);

          const trackParams = new URLSearchParams({ orderID: order.id });
          if (email) trackParams.set('email', email);

          return (
            <article key={order.id} className="rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-4">
              <div className="flex flex-col gap-3 border-b border-[#f7f1df]/10 pb-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase text-[#f7f1df]/44">#{idx + 1}</span>
                    <span className={`rounded-md px-2.5 py-1 text-xs font-black uppercase ${statusMeta.badgeClass}`}>
                      {statusMeta.label}
                    </span>
                    <span className="text-sm text-[#f7f1df]/52">{dateTime(order.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-[#f7f1df]/52">{statusMeta.adminDescription}</p>
                  <p className="mt-2 break-all font-mono text-lg text-[#f7f1df]">{order.id}</p>
                </div>
                <div className="grid gap-3 lg:min-w-[23rem]">
                  <OrderStatusControl orderId={order.id} currentStatus={order.status} />
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/track-order?${trackParams.toString()}`}
                      className="kk-focus inline-flex h-9 items-center rounded-md border border-[#f7f1df]/18 px-3 text-sm font-semibold hover:bg-[#f7f1df]/8"
                    >
                      Track view
                    </Link>
                    {email ? (
                      <a
                        href={`mailto:${email}`}
                        className="kk-focus inline-flex h-9 items-center rounded-md border border-[#f7f1df]/18 px-3 text-sm font-semibold hover:bg-[#f7f1df]/8"
                      >
                        Email
                      </a>
                    ) : null}
                    <span className="inline-flex h-9 items-center rounded-md bg-[#f7f1df] px-3 text-sm font-black text-black">
                      {money(order.amountTotal, order.currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1fr_1.4fr]">
                <div>
                  <p className="text-xs font-black uppercase text-[#f7f1df]/44">Customer</p>
                  <p className="mt-1 font-semibold text-[#f7f1df]">{name}</p>
                  <p className="mt-1 break-all text-sm text-[#f7f1df]/60">{email || 'No email saved'}</p>
                  {order.shipPhone ? <p className="mt-1 text-sm text-[#f7f1df]/60">{order.shipPhone}</p> : null}
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-[#f7f1df]/44">Ship to</p>
                  {addressParts.length > 0 ? (
                    <div className="mt-1 space-y-1 text-sm text-[#f7f1df]/72">
                      {addressParts.map((line) => <p key={line}>{line}</p>)}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-[#f7f1df]/52">No address saved</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-[#f7f1df]/44">Items</p>
                  {order.items.length > 0 ? (
                    <ul className="mt-1 space-y-2">
                      {order.items.map((item, itemIndex) => (
                        <li key={`${item.sku}-${itemIndex}`} className="text-sm text-[#f7f1df]/72">
                          <span className="font-semibold text-[#f7f1df]">{item.title}</span>
                          <span> x{item.qty}</span>
                          <span> / {money(item.unitPrice, order.currency)}</span>
                          {[item.color, item.size].filter(Boolean).length ? (
                            <span> / {[item.color, item.size].filter(Boolean).join(' / ')}</span>
                          ) : null}
                          <span className="block break-all text-xs text-[#f7f1df]/42">
                            SKU {item.sku || 'not saved'}
                            {item.printifyVariantId ? ` / Variant ${item.printifyVariantId}` : ''}
                            {item.printifyProductId ? ` / Product ${item.printifyProductId}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-[#f7f1df]/52">{order.productTitle ?? 'No items saved'}</p>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {orders.length === 0 ? (
          <div className="rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-8 text-center">
            <h2 className="text-xl font-black">No orders found</h2>
            <p className="mt-2 text-sm text-[#f7f1df]/58">Try a different order ID, email, SKU, or city.</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
