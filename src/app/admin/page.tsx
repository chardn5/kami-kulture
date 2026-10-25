import Link from 'next/link';
import { ArrowUpRight, Package, TriangleAlert, Clock, ShoppingBag } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireAdminPageAccess } from '@/lib/adminPageAuth';
import { paypalEnvironment } from '@/lib/paypalServer';
import { getOrderStatusMeta } from '@/lib/orderStatus';
import LocalDateTime from './orders/LocalDateTime';

export default async function AdminOverview() {
  await requireAdminPageAccess('/admin');
  const groups = await prisma.order.groupBy({ by: ['status'], _count: true });
  const count = (...statuses: string[]) => groups.filter(g => statuses.includes(g.status)).reduce((n, g) => n + g._count, 0);
  const totals = await prisma.order.aggregate({ where: { captureId: { not: null }, currency: 'USD', status: { notIn: ['REFUNDED', 'CANCELED', 'CANCELLED'] } }, _sum: { amountTotal: true, printifyCostTotal: true, estimatedProfit: true }, _count: true });
  const recent = await prisma.order.findMany({ take: 8, orderBy: { createdAt: 'desc' }, select: { id: true, status: true, createdAt: true, shipFirstName: true, shipLastName: true, payerName: true, amountTotal: true, currency: true } });
  const products = await prisma.product.count({ where: { visible: true } });
  const needsReview = await prisma.paymentEvent.count({ where: { status: { in: ['FAILED', 'REVIEW'] } } });
  const pendingNotifications = await prisma.order.count({ where: { paidAt: { not: null }, paymentEffectsCompletedAt: null } });
  const mode = paypalEnvironment();
  const dollars = (n: { toNumber(): number } | null) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n?.toNumber() ?? 0);
  return <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase text-[#35d7f2]">Store operations</p><h1 className="mt-1 text-3xl font-black">Overview</h1></div><span className={`rounded-md px-3 py-2 text-xs font-bold uppercase ${mode === 'sandbox' ? 'bg-[#35d7f2]/15 text-[#35d7f2]' : 'bg-[#d6ff57] text-black'}`}>PayPal {mode}</span></div>
    {mode === 'sandbox' ? <p role="status" className="mt-5 border-l-2 border-[#35d7f2] bg-[#35d7f2]/5 p-4 text-sm text-white/75">Sandbox payments are test transactions, not real revenue. Historical totals may include earlier test orders. Manual Printify submission can still create a real fulfillment order.</p> : null}
    <dl className="mt-7 grid grid-cols-2 gap-5 border-y border-white/15 py-6 lg:grid-cols-4">{[
      ['Captured orders', String(totals._count)], ['Captured sales · USD', dollars(totals._sum.amountTotal)],
      ['Printify costs recorded · USD', dollars(totals._sum.printifyCostTotal)], ['Published products', String(products)],
    ].map(([label, value]) => <div key={label}><dt className="text-xs text-white/55">{label}</dt><dd className="mt-2 text-2xl font-bold">{value}</dd></div>)}</dl>
    <h2 className="mt-8 text-lg font-bold">Work queue</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
      { label: 'Ready for review', value: count('PAID'), href: '/admin/orders?status=PAID', icon: ShoppingBag },
      { label: 'Fulfillment issues', value: count('FULFILLMENT_FAILED'), href: '/admin/orders?status=FULFILLMENT_FAILED', icon: TriangleAlert },
      { label: 'Awaiting payment', value: count('PENDING_PAYMENT'), href: '/admin/orders?status=PENDING_PAYMENT', icon: Clock },
      { label: 'In Printify', value: count('FULFILLMENT_SUBMITTED'), href: '/admin/orders?status=FULFILLMENT_SUBMITTED', icon: Package },
    ].map(({ label, value, href, icon: Icon }) => <Link key={label} href={href} className="kk-focus rounded-md border border-white/15 bg-[#171a18] p-4 hover:border-[#35d7f2]/60"><div className="flex justify-between text-white/60"><Icon size={18} /><ArrowUpRight size={16} /></div><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-white/65">{label}</p></Link>)}</div>
    {(needsReview > 0 || pendingNotifications > 0) ? <Link href="/admin/payments" className="kk-focus mt-5 block border-l-2 border-[#ff7885] p-3 text-sm text-[#ff7885]">{needsReview} payment events need review · {pendingNotifications} orders have pending notifications</Link> : null}
    <div className="mt-8 flex items-center justify-between"><h2 className="text-lg font-bold">Recent orders</h2><Link href="/admin/orders" className="kk-focus text-sm text-[#35d7f2]">All orders</Link></div>
    <div className="mt-3 divide-y divide-white/10 border-y border-white/15">{recent.map(order => <Link key={order.id} href={`/admin/orders/${encodeURIComponent(order.id)}`} className="kk-focus grid gap-2 py-4 sm:grid-cols-[1.5fr_1fr_auto] sm:items-center"><div><p className="break-all font-mono text-sm">{order.id}</p><p className="mt-1 text-sm text-white/55">{[order.shipFirstName, order.shipLastName].filter(Boolean).join(' ') || order.payerName || 'Checkout in progress'}</p></div><div><p className="text-sm">{getOrderStatusMeta(order.status).label}</p><LocalDateTime value={order.createdAt.toISOString()} className="text-xs text-white/50" /></div><p className="font-semibold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency }).format(order.amountTotal.toNumber())}</p></Link>)}{!recent.length ? <p className="py-8 text-sm text-white/55">No orders yet.</p> : null}</div>
    <p className="mt-4 text-xs text-white/45">USD totals exclude canceled and refunded orders. Costs are incomplete until Printify reports them. Profit estimates exclude advertising, currency conversion, and business taxes.</p>
  </section>;
}
