import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdminPageAccess } from '@/lib/adminPageAuth';
import { paypalEnvironment } from '@/lib/paypalServer';
import { isPrintifyAutoSubmitEnabled } from '@/lib/printifyFulfillment';
import { RETAIL_PRICES_CENTS } from '@/lib/retailPricing';
import { estimatePaymentFee } from '@/lib/pricing';
import LocalDateTime from '../orders/LocalDateTime';
import RetryPaymentsButton from './RetryPaymentsButton';

export default async function AdminPayments() {
  await requireAdminPageAccess('/admin/payments');
  const events = await prisma.paymentEvent.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
  const pending = await prisma.order.findMany({ where: { paidAt: { not: null }, paymentEffectsCompletedAt: null }, take: 25, orderBy: { paidAt: 'desc' } });
  return <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6"><h1 className="text-3xl font-black">Payments</h1>
    <dl className="mt-6 grid gap-5 border-y border-white/15 py-5 sm:grid-cols-2 lg:grid-cols-4">{[
      ['PayPal environment', paypalEnvironment()], ['Webhook verification', process.env.PAYPAL_WEBHOOK_ID ? 'Configured' : 'Not configured'],
      ['Printify submission', isPrintifyAutoSubmitEnabled() ? 'Automatic' : 'Manual approval'], ['$100 payment · estimated fee', `$${estimatePaymentFee(100).toFixed(2)} USD, before FX`],
    ].map(([label, value]) => <div key={label}><dt className="text-xs text-white/50">{label}</dt><dd className="mt-2 font-semibold">{value}</dd></div>)}</dl>
    <div className="mt-7 flex flex-wrap items-start justify-between gap-3"><h2 className="text-lg font-bold">Pending notifications · {pending.length}</h2><RetryPaymentsButton /></div>
    <div className="divide-y divide-white/10">{pending.map(order => <div key={order.id} className="py-4"><Link href={`/admin/orders/${encodeURIComponent(order.id)}`} className="break-all font-mono text-sm text-[#35d7f2]">{order.id}</Link><p className="mt-1 text-sm text-white/65">Receipt: {order.receiptSentAt ? 'Sent' : 'Pending'} · Admin email: {order.adminNotificationSentAt ? 'Sent' : 'Pending'}</p>{order.paymentLastError ? <p className="mt-1 text-xs text-[#ff7885]">{order.paymentLastError}</p> : null}</div>)}{!pending.length ? <p className="py-4 text-sm text-white/50">No pending notifications.</p> : null}</div>
    <h2 className="mt-8 text-lg font-bold">PayPal event activity</h2>
    <div className="mt-3 divide-y divide-white/10 border-y border-white/15">{events.map(event => <article key={event.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto]"><div><p className="break-all text-sm font-semibold">{event.type}</p><p className="mt-1 break-all font-mono text-xs text-white/45">{event.id}</p>{event.orderId ? <Link className="mt-1 inline-block text-sm text-[#35d7f2]" href={`/admin/orders/${encodeURIComponent(event.orderId)}`}>{event.orderId}</Link> : null}{event.paypalOrderId ? <p className="mt-1 text-xs text-white/55">PayPal {event.paypalOrderId}</p> : null}{event.lastError ? <p className="mt-1 text-xs text-[#ff7885]">{event.lastError}</p> : null}</div><div className="text-sm"><p className={['REVIEW', 'FAILED'].includes(event.status) ? 'text-[#ff7885]' : 'text-[#d6ff57]'}>{event.status} · {event.environment}</p><LocalDateTime value={event.createdAt.toISOString()} className="text-xs text-white/50" /><p className="mt-1 text-xs text-white/45">Deliveries: {event.attempts}</p></div></article>)}{!events.length ? <p className="py-8 text-sm text-white/50">No verified webhook events received yet.</p> : null}</div>
    <p className="mt-3 text-xs text-white/50">Refund, reversal, and denied-payment events require review in PayPal and Printify. This page does not issue refunds or cancel production.</p>
    <h2 className="mt-8 text-lg font-bold">Retail prices · USD</h2><dl className="mt-3 grid grid-cols-2 gap-4 border-y border-white/15 py-4 sm:grid-cols-4">{Object.entries(RETAIL_PRICES_CENTS).map(([size, cents]) => <div key={size}><dt className="text-xs text-white/50">{size}</dt><dd className="mt-1 font-semibold">${(cents / 100).toFixed(2)}</dd></div>)}</dl>
  </section>;
}
