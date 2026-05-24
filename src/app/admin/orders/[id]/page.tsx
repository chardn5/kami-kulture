import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdminPageAccess } from '@/lib/adminPageAuth';
import { getOrderStatusMeta } from '@/lib/orderStatus';
import { getOrderShippingSnapshot, getPrintifyReadiness } from '@/lib/printifyFulfillment';
import LocalDateTime, { LocalTimeZoneNote } from '../LocalDateTime';
import OrderEmailControl from '../OrderEmailControl';
import OrderStatusControl from '../OrderStatusControl';
import PrintifySubmitControl from '../PrintifySubmitControl';

type PageProps = {
  params: Promise<{ id: string }>;
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

function money(amount: unknown, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(toNumber(amount));
}

function printifyLabel(value?: string | null) {
  if (!value) return 'Not available';
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function jsonText(value: unknown) {
  return JSON.stringify(
    value,
    (_key, item) => (typeof item === 'bigint' ? item.toString() : item),
    2
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-[#f7f1df]/44">{label}</p>
      <div className={`mt-1 break-words text-sm text-[#f7f1df]/76 ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-[#f7f1df]/38">Not saved</span>}
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-5 ${className}`}>
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function JsonPanel({ title, value }: { title: string; value: unknown }) {
  if (!value) return null;
  return (
    <details className="rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-5">
      <summary className="cursor-pointer text-lg font-black">{title}</summary>
      <pre className="mt-4 max-h-[32rem] overflow-auto rounded-md bg-black/30 p-4 text-xs leading-5 text-[#f7f1df]/72">
        {jsonText(value)}
      </pre>
    </details>
  );
}

export default async function AdminOrderDetail({ params }: PageProps) {
  const { id } = await params;
  const orderId = decodeURIComponent(id || '').trim();
  await requireAdminPageAccess(`/admin/orders/${encodeURIComponent(orderId)}`);

  if (!orderId) notFound();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        select: {
          id: true,
          title: true,
          sku: true,
          qty: true,
          unitPrice: true,
          size: true,
          color: true,
          image: true,
          printifyProductId: true,
          printifyVariantId: true,
        },
      },
    },
  });

  if (!order) notFound();

  const statusMeta = getOrderStatusMeta(order.status);
  const customerName =
    (order.shipFirstName || order.shipLastName)
      ? `${order.shipFirstName ?? ''} ${order.shipLastName ?? ''}`.trim()
      : (order.payerName ?? 'Unknown customer');
  const email = order.shipEmail ?? order.payerEmail ?? order.buyerEmail ?? '';
  const addressLines = [
    order.shipAddress1,
    order.shipAddress2,
    [order.shipCity, order.shipState, order.shipPostalCode].filter(Boolean).join(', '),
    order.shipCountry,
  ].filter(Boolean);
  const trackParams = new URLSearchParams({ orderID: order.id });
  if (email) trackParams.set('email', email);

  const fallbackSkus = Array.from(new Set(
    order.items
      .filter((item) => !(item.printifyProductId && typeof item.printifyVariantId === 'number'))
      .map((item) => item.sku)
      .filter(Boolean)
  ));
  const resolvableSkus = new Set(
    fallbackSkus.length
      ? (await prisma.productVariant.findMany({
          where: { sku: { in: fallbackSkus } },
          select: { sku: true },
        })).map((variant) => variant.sku)
      : []
  );
  const readiness = getPrintifyReadiness({
    shipping: getOrderShippingSnapshot(order),
    resolvableSkus,
    lines: order.items.map((item) => ({
      sku: item.sku,
      title: item.title,
      qty: item.qty,
      size: item.size,
      color: item.color,
      printifyProductId: item.printifyProductId,
      printifyVariantId: item.printifyVariantId,
    })),
  });

  const fulfillmentEvents = [
    ['Paid', order.createdAt, 'Payment captured in PayPal'],
    ['Printify order', order.printifySubmittedAt, order.printifyOrderId ? 'Submitted to Printify' : 'Not submitted yet'],
    ['Shipped', order.shippedAt, order.trackingNumber ? 'Carrier tracking available' : 'Waiting for carrier scan'],
    ['Delivered', order.deliveredAt, 'Marked delivered by fulfillment data'],
  ] as const;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/admin/orders" className="kk-focus text-sm font-semibold text-[#35d7f2] hover:underline">
            Back to orders
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-2.5 py-1 text-xs font-black uppercase ${statusMeta.badgeClass}`}>
              {statusMeta.label}
            </span>
            <LocalTimeZoneNote className="text-xs font-semibold text-[#f7f1df]/48" />
          </div>
          <h1 className="mt-2 break-all font-mono text-3xl font-black">{order.id}</h1>
          <p className="mt-2 text-sm text-[#f7f1df]/58">{statusMeta.adminDescription}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/track-order?${trackParams.toString()}`}
            className="kk-focus inline-flex h-10 items-center rounded-md border border-[#f7f1df]/18 px-3 text-sm font-semibold hover:bg-[#f7f1df]/8"
          >
            Track view
          </Link>
          {email ? (
            <a
              href={`mailto:${email}`}
              className="kk-focus inline-flex h-10 items-center rounded-md border border-[#f7f1df]/18 px-3 text-sm font-semibold hover:bg-[#f7f1df]/8"
            >
              Email customer
            </a>
          ) : null}
          <span className="inline-flex h-10 items-center rounded-md bg-[#f7f1df] px-3 text-sm font-black text-black">
            {money(order.amountTotal, order.currency)}
          </span>
        </div>
      </div>

      <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Subtotal', money(order.amountSubtotal, order.currency)],
          ['Shipping', money(order.amountShipping, order.currency)],
          ['Tax', money(order.amountTax, order.currency)],
          ['Total paid', money(order.amountTotal, order.currency)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-4">
            <p className="text-xs font-black uppercase text-[#f7f1df]/44">{label}</p>
            <p className="mt-2 text-2xl font-black text-[#f7f1df]">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_25rem]">
        <div className="space-y-5">
          <Panel title="Customer and shipping">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-4">
                <Field label="Customer" value={customerName} />
                <Field label="Email" value={email} />
                <Field label="Phone" value={order.shipPhone} />
              </div>
              <div>
                <p className="text-xs font-black uppercase text-[#f7f1df]/44">Ship to</p>
                {addressLines.length ? (
                  <div className="mt-1 space-y-1 text-sm text-[#f7f1df]/76">
                    {addressLines.map((line) => <p key={line}>{line}</p>)}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-[#f7f1df]/38">No address saved</p>
                )}
              </div>
            </div>
          </Panel>

          <Panel title="Items">
            {order.items.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
                  <thead className="text-xs uppercase text-[#f7f1df]/44">
                    <tr>
                      <th className="border-b border-[#f7f1df]/10 pb-2">Item</th>
                      <th className="border-b border-[#f7f1df]/10 pb-2">Variant</th>
                      <th className="border-b border-[#f7f1df]/10 pb-2 text-right">Qty</th>
                      <th className="border-b border-[#f7f1df]/10 pb-2 text-right">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id} className="border-b border-[#f7f1df]/10 align-top last:border-b-0">
                        <td className="py-3">
                          <p className="font-semibold text-[#f7f1df]">{item.title}</p>
                          <p className="mt-1 break-all font-mono text-xs text-[#f7f1df]/42">SKU {item.sku || 'not saved'}</p>
                        </td>
                        <td className="py-3 text-[#f7f1df]/70">
                          {[item.color, item.size].filter(Boolean).join(' / ') || 'Default'}
                          <span className="mt-1 block break-all font-mono text-xs text-[#f7f1df]/42">
                            {item.printifyVariantId ? `Variant ${item.printifyVariantId}` : 'No Printify variant'}
                            {item.printifyProductId ? ` / Product ${item.printifyProductId}` : ''}
                          </span>
                        </td>
                        <td className="py-3 text-right text-[#f7f1df]/70">{item.qty}</td>
                        <td className="py-3 text-right font-semibold text-[#f7f1df]">{money(item.unitPrice, order.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-[#f7f1df]/52">No line items saved.</p>
            )}
          </Panel>

          <Panel title="Fulfillment timeline">
            <div className="space-y-3">
              {fulfillmentEvents.map(([label, value, detail]) => (
                <div key={label} className="grid gap-2 rounded-md border border-[#f7f1df]/10 bg-black/18 p-3 sm:grid-cols-[10rem_1fr]">
                  <div>
                    <p className="text-sm font-black text-[#f7f1df]">{label}</p>
                    <p className="mt-1 text-xs text-[#f7f1df]/48">{detail}</p>
                  </div>
                  <div className="text-sm font-semibold text-[#f7f1df]/76">
                    {value ? <LocalDateTime value={value.toISOString()} includeSeconds /> : <span className="text-[#f7f1df]/38">Waiting</span>}
                  </div>
                </div>
              ))}
              {order.trackingUrl || order.trackingNumber ? (
                <div className="rounded-md border border-[#f7f1df]/10 bg-black/18 p-3">
                  <p className="text-xs font-black uppercase text-[#f7f1df]/44">Tracking</p>
                  {order.trackingUrl ? (
                    <a
                      href={order.trackingUrl}
                      className="kk-focus mt-1 inline-flex break-all text-sm font-semibold text-[#35d7f2] hover:underline"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {[order.trackingCarrier?.toUpperCase(), order.trackingNumber].filter(Boolean).join(' ') || 'Open tracking'}
                    </a>
                  ) : (
                    <p className="mt-1 break-all font-semibold text-[#f7f1df]">
                      {[order.trackingCarrier?.toUpperCase(), order.trackingNumber].filter(Boolean).join(' ')}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <JsonPanel title="Saved PayPal/order payload" value={order.raw} />
            <JsonPanel title="Printify payload" value={order.printifyPayload} />
          </div>
        </div>

        <aside className="space-y-4">
          <OrderStatusControl orderId={order.id} currentStatus={order.status} />
          <PrintifySubmitControl
            orderId={order.id}
            currentStatus={order.status}
            printifyOrderId={order.printifyOrderId}
            printifyStatus={order.printifyStatus}
            printifySubmittedAt={order.printifySubmittedAt?.toISOString() ?? null}
            printifyLastError={order.printifyLastError}
            readinessIssues={readiness.issues}
          />
          <OrderEmailControl orderId={order.id} customerEmail={email} />

          <Panel title="Provider references">
            <div className="space-y-4">
              <Field label="PayPal capture" value={order.captureId} mono />
              <Field label="Printify order" value={order.printifyOrderId} mono />
              <Field label="Printify status" value={printifyLabel(order.printifyStatus)} />
              <Field
                label="Created"
                value={<LocalDateTime value={order.createdAt.toISOString()} includeSeconds />}
              />
              <Field
                label="Updated"
                value={<LocalDateTime value={order.updatedAt.toISOString()} includeSeconds />}
              />
              {order.statusEmailSentAt ? (
                <Field
                  label="Last status email"
                  value={
                    <>
                      {order.statusEmailLastStatus || 'Unknown'} at{' '}
                      <LocalDateTime value={order.statusEmailSentAt.toISOString()} includeSeconds />
                    </>
                  }
                />
              ) : null}
            </div>
          </Panel>

          <Panel title="Profit estimate">
            <div className="space-y-4">
              <Field label="Printify item cost" value={money(order.printifyCostSubtotal, order.currency)} />
              <Field label="Printify shipping" value={money(order.printifyCostShipping, order.currency)} />
              <Field label="Printify total" value={money(order.printifyCostTotal, order.currency)} />
              <Field label="PayPal fee est." value={money(order.estimatedPaymentFee, order.currency)} />
              <div>
                <p className="text-xs font-black uppercase text-[#f7f1df]/44">Profit est.</p>
                <p className={`mt-1 text-2xl font-black ${toNumber(order.estimatedProfit) < 0 ? 'text-[#ff4f5f]' : 'text-[#d6ff57]'}`}>
                  {money(order.estimatedProfit, order.currency)}
                </p>
              </div>
            </div>
          </Panel>

          <div className="rounded-lg border border-[#ff4f5f]/24 bg-[#ff4f5f]/8 p-4 text-sm leading-6 text-[#f7f1df]/70">
            <p className="font-black text-[#ff4f5f]">Refund note</p>
            <p className="mt-2">
              Marking an order canceled or refunded here only updates Kami Kulture admin status.
              PayPal refunds and Printify production changes still need to be handled in those
              provider dashboards.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
