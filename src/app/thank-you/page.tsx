'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import { getOrderStatusMeta } from '@/lib/orderStatus';

type LookupItem = {
  title: string;
  qty: number;
  unitPrice?: string | null;
  size?: string | null;
  color?: string | null;
  sku?: string | null;
};

type LookupResult =
  | null
  | { found: false }
  | {
      found: true;
      status?: string;
      amountTotal?: string | null;
      amountSubtotal?: string | null;
      amountShipping?: string | null;
      amountTax?: string | null;
      currency?: string;
      createdAt?: string;
      fulfilledAt?: string | null;
      printifyStatus?: string | null;
      trackingCarrier?: string | null;
      trackingNumber?: string | null;
      trackingUrl?: string | null;
      shippedAt?: string | null;
      deliveredAt?: string | null;
      items?: LookupItem[];
      shipping?: { city?: string | null; state?: string | null; country?: string | null };
    };

function formatMoney(value?: string | null, currency = 'USD') {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    Number.isFinite(amount) ? amount : 0
  );
}

function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function ThankYouInner() {
  const search = useSearchParams();

  const orderIdParam = search.get('order') || search.get('orderID') || '';
  const emailFromQuery = search.get('email') || '';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult>(null);
  const [lookupAttempted, setLookupAttempted] = useState(false);
  const [copied, setCopied] = useState(false);

  const trackHref = useMemo(() => {
    const qs = new URLSearchParams();
    if (orderIdParam) qs.set('orderID', orderIdParam);
    if (email) qs.set('email', email);
    const query = qs.toString();
    return query ? `/track-order?${query}` : '/track-order';
  }, [email, orderIdParam]);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('kk_email') || '' : '';
    const preferred = emailFromQuery || stored;
    if (preferred) setEmail(preferred);
  }, [emailFromQuery]);

  useEffect(() => {
    if (!orderIdParam || !email || lookupAttempted) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/orders/lookup', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ orderID: orderIdParam, email }),
        });
        const json = (await res.json()) as LookupResult;
        setResult(json);
      } catch {
        setResult(null);
      } finally {
        setLoading(false);
        setLookupAttempted(true);
      }
    })();
  }, [orderIdParam, email, lookupAttempted]);

  async function handleManualLookup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!orderIdParam || !email) return;

    try {
      setLoading(true);
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderID: orderIdParam, email }),
      });
      const json = (await res.json()) as LookupResult;
      setResult(json);
      if (typeof window !== 'undefined') sessionStorage.setItem('kk_email', email);
    } finally {
      setLoading(false);
      setLookupAttempted(true);
    }
  }

  async function copyOrderId() {
    if (!orderIdParam || !navigator.clipboard) return;
    await navigator.clipboard.writeText(orderIdParam);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const verified = result && 'found' in result && result.found ? result : null;
  const items = verified?.items?.length ? verified.items : [];
  const currency = verified?.currency || 'USD';
  const placedAt = formatDate(verified?.createdAt);
  const shippedAt = formatDate(verified?.shippedAt ?? verified?.fulfilledAt ?? undefined);
  const statusMeta = getOrderStatusMeta(verified?.status);

  return (
    <main className="kk-container max-w-4xl py-10 sm:py-14">
      <section className="text-center">
        <p className="text-sm font-black uppercase text-[#d6ff57]">Order confirmed</p>
        <h1 className="mt-2 text-4xl font-black sm:text-5xl">Thank you</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#f7f1df]/68 sm:text-base">
          Your payment was received. Keep this page open, copy your order ID, or jump straight to
          tracking when you need it.
        </p>

        {orderIdParam ? (
          <div className="mx-auto mt-6 flex max-w-xl flex-col items-stretch justify-center gap-3 rounded-lg border border-[#f7f1df]/14 bg-[#171711] p-4 text-left sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase text-[#f7f1df]/48">Order ID</p>
              <p className="mt-1 break-all font-mono text-lg text-[#f7f1df]">{orderIdParam}</p>
            </div>
            <button
              onClick={copyOrderId}
              className="kk-focus inline-flex h-11 items-center justify-center rounded-md border border-[#f7f1df]/18 px-4 text-sm font-semibold hover:bg-[#f7f1df]/8"
              type="button"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        ) : null}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-[#f7f1df]/14 bg-[#171711] p-5">
          <div className="flex flex-col gap-3 border-b border-[#f7f1df]/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black">Receipt summary</h2>
              {placedAt ? <p className="mt-1 text-sm text-[#f7f1df]/58">Placed {placedAt}</p> : null}
            </div>
            <span className={`w-fit rounded-md px-3 py-1 text-xs font-black uppercase ${
              verified ? statusMeta.badgeClass : 'bg-[#d6ff57] text-black'
            }`}>
              {verified ? statusMeta.label : loading ? 'Checking' : 'Received'}
            </span>
          </div>

          {loading ? (
            <p className="py-6 text-sm text-[#f7f1df]/58">Checking your order details...</p>
          ) : verified ? (
            <>
              {items.length > 0 ? (
                <ul className="divide-y divide-[#f7f1df]/10">
                  {items.map((item, index) => (
                    <li key={`${item.sku ?? item.title}-${index}`} className="flex gap-4 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#f7f1df]">{item.title}</p>
                        <p className="mt-1 text-sm text-[#f7f1df]/58">
                          {[item.color, item.size].filter(Boolean).join(' / ') || 'Standard'} / Qty{' '}
                          {item.qty}
                        </p>
                        {item.sku ? <p className="mt-1 break-all text-xs text-[#f7f1df]/40">SKU {item.sku}</p> : null}
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-[#f7f1df]">
                        {formatMoney(item.unitPrice, currency)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-sm text-[#f7f1df]/58">Your order is paid and saved.</p>
              )}
              <p className="border-t border-[#f7f1df]/10 py-4 text-sm leading-6 text-[#f7f1df]/64">
                {statusMeta.customerDescription}
              </p>
              {verified.printifyStatus ? (
                <p className="pb-4 text-sm leading-6 text-[#f7f1df]/58">
                  Fulfillment status: {verified.printifyStatus.replace(/[-_]+/g, ' ')}
                  {shippedAt ? ` / Shipped ${shippedAt}` : ''}
                </p>
              ) : null}
              {(verified.trackingNumber || verified.trackingUrl) ? (
                <div className="mb-4 rounded-lg border border-[#d6ff57]/30 bg-[#d6ff57]/8 p-4">
                  <p className="text-xs font-black uppercase text-[#d6ff57]">Carrier tracking</p>
                  <p className="mt-2 break-all text-lg font-black text-[#f7f1df]">
                    {[verified.trackingCarrier?.toUpperCase(), verified.trackingNumber].filter(Boolean).join(' ') || 'Tracking available'}
                  </p>
                  {verified.trackingUrl ? (
                    <a
                      href={verified.trackingUrl}
                      className="kk-focus mt-3 inline-flex h-10 items-center rounded-md bg-[#f7f1df] px-3 text-sm font-black text-black hover:bg-[#d6ff57]"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Open carrier tracking
                    </a>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2 border-t border-[#f7f1df]/10 pt-4 text-sm">
                <div className="flex justify-between gap-4 text-[#f7f1df]/64">
                  <span>Subtotal</span>
                  <span>{formatMoney(verified.amountSubtotal ?? verified.amountTotal, currency)}</span>
                </div>
                <div className="flex justify-between gap-4 text-[#f7f1df]/64">
                  <span>Shipping</span>
                  <span>{formatMoney(verified.amountShipping, currency)}</span>
                </div>
                <div className="flex justify-between gap-4 text-[#f7f1df]/64">
                  <span>Tax</span>
                  <span>{formatMoney(verified.amountTax, currency)}</span>
                </div>
                <div className="flex justify-between gap-4 pt-2 text-lg font-black text-[#f7f1df]">
                  <span>Total</span>
                  <span>{formatMoney(verified.amountTotal, currency)}</span>
                </div>
              </div>
            </>
          ) : result && 'found' in result && !result.found ? (
            <p className="py-6 text-sm text-[#ff4f5f]">
              We could not verify that order with the email provided. Try the checkout email exactly
              as entered.
            </p>
          ) : (
            <p className="py-6 text-sm text-[#f7f1df]/58">
              Enter your checkout email to unlock the full receipt details.
            </p>
          )}

          {!loading && (!lookupAttempted || (result && 'found' in result && !result.found)) ? (
            <form onSubmit={handleManualLookup} className="mt-2 grid gap-3 border-t border-[#f7f1df]/10 pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <Input
                type="email"
                label="Email used at checkout"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button
                className="kk-focus inline-flex h-11 items-center justify-center rounded-md bg-[#f7f1df] px-4 text-sm font-black text-black hover:bg-[#d6ff57] disabled:opacity-50"
                disabled={!orderIdParam || !email || loading}
                type="submit"
              >
                {loading ? 'Checking...' : 'Verify'}
              </button>
            </form>
          ) : null}
        </div>

        <aside className="rounded-lg border border-[#f7f1df]/14 bg-[#171711] p-5">
          <h2 className="text-xl font-black">What happens next</h2>
          <ol className="mt-4 space-y-4">
            {[
              ['Payment received', 'Your PayPal payment was captured and the order was saved.'],
              ['Receipt sent', 'A confirmation email with the tracking link was sent to checkout email.'],
              ['Production queue', 'The order is ready for fulfillment review and Printify processing.'],
            ].map(([title, body], index) => (
              <li key={title} className="grid grid-cols-[2rem_1fr] gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#f7f1df] text-sm font-black text-black">
                  {index + 1}
                </span>
                <span>
                  <span className="block font-semibold text-[#f7f1df]">{title}</span>
                  <span className="mt-1 block text-sm leading-5 text-[#f7f1df]/58">{body}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-6 grid gap-3">
            <Link
              href={trackHref}
              className="kk-focus inline-flex h-11 items-center justify-center rounded-md bg-[#f7f1df] px-4 text-sm font-black text-black hover:bg-[#d6ff57]"
            >
              Track order
            </Link>
            <Link
              href="/products"
              className="kk-focus inline-flex h-11 items-center justify-center rounded-md border border-[#f7f1df]/18 px-4 text-sm font-semibold hover:bg-[#f7f1df]/8"
            >
              Browse more designs
            </Link>
            <a
              href="mailto:orders@kamikulture.com"
              className="kk-focus inline-flex h-11 items-center justify-center rounded-md border border-[#f7f1df]/18 px-4 text-sm font-semibold hover:bg-[#f7f1df]/8"
            >
              Contact support
            </a>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={<main className="kk-container max-w-4xl py-14 text-center">Loading...</main>}>
      <ThankYouInner />
    </Suspense>
  );
}
