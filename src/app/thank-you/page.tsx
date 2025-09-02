'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Input from '@/components/ui/Input';

const TOTAL = 10;

type LookupResult =
  | null
  | { found: false }
  | { found: true; status?: string; amountTotal?: string; currency?: string };

function ThankYouInner() {
  const router = useRouter();
  const search = useSearchParams();

  // Accept both ?order (new) and ?orderID (legacy)
  const orderIdParam = search.get('order') || search.get('orderID') || '';

  const emailFromQuery = search.get('email') || '';
  const [email, setEmail] = useState('');
  const [seconds, setSeconds] = useState(TOTAL);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult>(null);
  const [lookupAttempted, setLookupAttempted] = useState(false);

  // Try to auto-fill email from sessionStorage or URL
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('kk_email') || '' : '';
    const preferred = emailFromQuery || stored;
    if (preferred) setEmail(preferred);
  }, [emailFromQuery]);

  // Countdown redirect
  useEffect(() => {
    const t = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (seconds === 0) router.push('/');
  }, [seconds, router]);

  const pct = useMemo(() => ((TOTAL - seconds) / TOTAL) * 100, [seconds]);

  // Auto-lookup once when we have orderId + email
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
        // ignore
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

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Thank you! 🎉</h1>

      <p className="mt-2 text-neutral-300">
        Your payment was received
        {orderIdParam ? (
          <>
            {' — '}Order ID: <span className="font-mono">{orderIdParam}</span>
            <button
              onClick={() => navigator.clipboard.writeText(orderIdParam)}
              className="ml-2 inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-white/5"
              aria-label="Copy order ID"
            >
              Copy
            </button>
          </>
        ) : null}
        .
      </p>

      {/* Order details (optional) */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold">Order details</h2>

        {loading && <p className="mt-2 text-sm text-neutral-400">Checking your order…</p>}

        {!loading && result && 'found' in result && result.found && (
          <div className="mt-3 inline-block rounded-md border border-white/10 px-4 py-3 text-left">
            {result.status && (
              <p>
                <span className="text-neutral-400">Status:</span>{' '}
                <span className="font-semibold text-white">{result.status}</span>
              </p>
            )}
            {result.amountTotal && (
              <p>
                <span className="text-neutral-400">Total:</span>{' '}
                <span className="font-semibold text-white">
                  {result.currency} {Number(result.amountTotal).toFixed(2)}
                </span>
              </p>
            )}
          </div>
        )}

        {!loading && result && 'found' in result && !result.found && (
          <p className="mt-2 text-sm text-red-400">We couldn’t verify that order with the email provided.</p>
        )}

        {/* If auto-lookup didn’t happen (no email) or failed, show a small form */}
        {!loading && (!lookupAttempted || (result && 'found' in result && !result.found)) && (
          <form
            onSubmit={handleManualLookup}
            className="mx-auto mt-4 flex max-w-md flex-col items-stretch gap-3 text-left"
          >
            <Input
              type="email"
              label="Email used at checkout"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={!orderIdParam || !email || loading}
              type="submit"
            >
              {loading ? 'Checking…' : 'Verify order'}
            </button>
          </form>
        )}
      </div>

      {/* Progress + actions */}
      <div className="mt-8">
        <p className="text-sm text-neutral-400" aria-live="polite">
          Returning to home in <span className="font-semibold text-white">{seconds}</span> seconds…
        </p>
        <div className="mt-3 h-2 w-full rounded bg-white/10">
          <div
            className="h-full rounded bg-white transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
            aria-hidden
          />
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-md border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/5"
          >
            Go to homepage now
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center rounded-md border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/5"
          >
            Browse more designs
          </Link>
          <Link
            href="/track-order"
            className="inline-flex items-center rounded-md border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/5"
          >
            Track order
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-2xl px-4 py-16 text-center">Loading…</main>}>
      <ThankYouInner />
    </Suspense>
  );
}
