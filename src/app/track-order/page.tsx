'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Input from '@/components/ui/Input';

type LookupItem = {
  title: string;
  qty: number;
  unitPrice?: string | null;
  size?: string | null;
  color?: string | null;
  sku?: string | null;
};

type LookupOk = {
  found: true;
  status?: string;
  amountTotal?: string | null;
  amountSubtotal?: string | null;
  amountShipping?: string | null;
  amountTax?: string | null;
  currency?: string;
  createdAt?: string;
  items?: LookupItem[];
  shipping?: { city?: string | null; state?: string | null; country?: string | null };
};
type LookupMiss = { found: false };
type LookupResult = LookupOk | LookupMiss | null;

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

function statusLabel(status?: string) {
  if (!status) return 'Paid';
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function TrackOrderInner() {
  const search = useSearchParams();
  const initialOrderID = search.get('orderID') || search.get('order') || '';
  const initialEmail = search.get('email') || '';

  const [orderID, setOrderID] = useState(initialOrderID);
  const [email, setEmail] = useState(initialEmail);
  const [result, setResult] = useState<LookupResult>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  useEffect(() => {
    if (initialOrderID) setOrderID(initialOrderID);
    if (initialEmail) {
      setEmail(initialEmail);
      return;
    }
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('kk_email') || '' : '';
    if (stored) setEmail(stored);
  }, [initialEmail, initialOrderID]);

  const lookup = useCallback(async (nextOrderID = orderID, nextEmail = email) => {
    setLoading(true);
    setResult(null);
    setErr(null);
    try {
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderID: nextOrderID, email: nextEmail }),
      });

      if (res.status === 429) {
        setErr('Too many attempts. Please try again in a minute.');
        return;
      }
      if (!res.ok) {
        setErr('Lookup failed. Please check your details and try again.');
        return;
      }

      const json = (await res.json()) as LookupOk | LookupMiss;
      setResult(json);
      if (json.found && typeof window !== 'undefined') {
        sessionStorage.setItem('kk_email', nextEmail);
      }
    } catch {
      setErr('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, orderID]);

  useEffect(() => {
    if (autoSubmitted || !orderID || !email) return;
    setAutoSubmitted(true);
    void lookup(orderID, email);
  }, [autoSubmitted, email, lookup, orderID]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAutoSubmitted(true);
    await lookup(orderID, email);
  }

  const found = result?.found ? result : null;
  const currency = found?.currency || 'USD';
  const items = found?.items?.length ? found.items : [];
  const placedAt = formatDate(found?.createdAt);
  const shipTo = found?.shipping
    ? [found.shipping.city, found.shipping.state, found.shipping.country].filter(Boolean).join(', ')
    : '';

  return (
    <main className="kk-container max-w-5xl py-10 sm:py-14">
      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <p className="text-sm font-black uppercase text-[#ff4f5f]">Order status</p>
          <h1 className="mt-2 text-4xl font-black sm:text-5xl">Track order</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#f7f1df]/68 sm:text-base">
            Enter the order ID and checkout email. Links from your receipt will fill this in
            automatically.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-lg border border-[#f7f1df]/14 bg-[#171711] p-5">
            <Input
              label="Order ID"
              placeholder="KK-YYMMDD-ABCDE"
              value={orderID}
              onChange={(e) => setOrderID(e.target.value.trim())}
              required
            />
            <Input
              type="email"
              label="Email used at checkout"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              required
            />
            <button
              className="kk-focus inline-flex h-11 items-center justify-center rounded-md bg-[#f7f1df] px-4 text-sm font-black text-black hover:bg-[#d6ff57] disabled:opacity-50"
              disabled={loading || !orderID || !email}
              type="submit"
            >
              {loading ? 'Checking...' : 'Check status'}
            </button>
          </form>

          {err ? <p className="mt-4 text-sm text-[#ff4f5f]">{err}</p> : null}
        </div>

        <div className="rounded-lg border border-[#f7f1df]/14 bg-[#171711] p-5" aria-live="polite">
          {!result && !loading ? (
            <div className="py-8">
              <h2 className="text-xl font-black">Ready when you are</h2>
              <p className="mt-2 text-sm leading-6 text-[#f7f1df]/58">
                Your order status appears here after a successful lookup.
              </p>
            </div>
          ) : loading ? (
            <div className="py-8">
              <h2 className="text-xl font-black">Checking order...</h2>
              <p className="mt-2 text-sm text-[#f7f1df]/58">This usually takes a second.</p>
            </div>
          ) : found ? (
            <>
              <div className="flex flex-col gap-3 border-b border-[#f7f1df]/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-[#f7f1df]/48">Current status</p>
                  <h2 className="mt-1 text-2xl font-black">{statusLabel(found.status)}</h2>
                  {placedAt ? <p className="mt-1 text-sm text-[#f7f1df]/58">Placed {placedAt}</p> : null}
                  {shipTo ? <p className="mt-1 text-sm text-[#f7f1df]/58">Ship to {shipTo}</p> : null}
                </div>
                <div className="rounded-md bg-[#d6ff57] px-3 py-2 text-sm font-black text-black">
                  {formatMoney(found.amountTotal, currency)}
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  ['Paid', 'Payment captured'],
                  ['Queued', 'Ready for fulfillment'],
                  ['Shipped', 'Tracking will appear by email'],
                ].map(([title, body], index) => (
                  <div key={title} className="border-l-2 border-[#d6ff57]/55 pl-3">
                    <p className="text-xs font-black uppercase text-[#f7f1df]/44">Step {index + 1}</p>
                    <p className="mt-1 font-semibold text-[#f7f1df]">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-[#f7f1df]/54">{body}</p>
                  </div>
                ))}
              </div>

              {items.length > 0 ? (
                <div className="mt-5">
                  <h3 className="text-sm font-black uppercase text-[#f7f1df]/52">Items</h3>
                  <ul className="mt-2 divide-y divide-[#f7f1df]/10">
                    {items.map((item, index) => (
                      <li key={`${item.sku ?? item.title}-${index}`} className="flex gap-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[#f7f1df]">{item.title}</p>
                          <p className="mt-1 text-sm text-[#f7f1df]/58">
                            {[item.color, item.size].filter(Boolean).join(' / ') || 'Standard'} / Qty {item.qty}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-[#f7f1df]">
                          {formatMoney(item.unitPrice, currency)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-5 space-y-2 border-t border-[#f7f1df]/10 pt-4 text-sm">
                <div className="flex justify-between gap-4 text-[#f7f1df]/64">
                  <span>Subtotal</span>
                  <span>{formatMoney(found.amountSubtotal ?? found.amountTotal, currency)}</span>
                </div>
                <div className="flex justify-between gap-4 text-[#f7f1df]/64">
                  <span>Shipping</span>
                  <span>{formatMoney(found.amountShipping, currency)}</span>
                </div>
                <div className="flex justify-between gap-4 text-[#f7f1df]/64">
                  <span>Tax</span>
                  <span>{formatMoney(found.amountTax, currency)}</span>
                </div>
                <div className="flex justify-between gap-4 pt-2 text-lg font-black text-[#f7f1df]">
                  <span>Total</span>
                  <span>{formatMoney(found.amountTotal, currency)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8">
              <h2 className="text-xl font-black">No match found</h2>
              <p className="mt-2 text-sm leading-6 text-[#f7f1df]/58">
                Check the order ID and use the exact email from checkout. If it still fails, reply
                to your receipt or contact support.
              </p>
              <a
                href="mailto:orders@kamikulture.com"
                className="kk-focus mt-5 inline-flex h-11 items-center justify-center rounded-md border border-[#f7f1df]/18 px-4 text-sm font-semibold hover:bg-[#f7f1df]/8"
              >
                Contact support
              </a>
            </div>
          )}
        </div>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
    </main>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<main className="kk-container max-w-5xl py-14 text-center">Loading...</main>}>
      <TrackOrderInner />
    </Suspense>
  );
}
