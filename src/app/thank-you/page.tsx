'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const TOTAL = 10; // seconds

export default function ThankYouPage() {
  const router = useRouter();
  const search = useSearchParams();
  const orderID = search.get('orderID') || '';
  const [seconds, setSeconds] = useState(TOTAL);

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (seconds === 0) router.push('/');
  }, [seconds, router]);

  const pct = ((TOTAL - seconds) / TOTAL) * 100;

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Thank you! 🎉</h1>
      <p className="mt-2 text-neutral-600">
        Your payment was received
        {orderID ? (
          <> — Order ID: <span className="font-mono">{orderID}</span></>
        ) : null}
        .
      </p>

      <div className="mt-8">
        <p className="text-sm text-neutral-700">
          Returning to home in <span className="font-semibold">{seconds}</span> seconds…
        </p>
        <div className="mt-3 h-2 w-full rounded bg-neutral-200">
          <div
            className="h-full rounded bg-black transition-[width] duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
            aria-hidden
          />
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Go to homepage now
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Browse more designs
          </Link>
        </div>
      </div>
    </main>
  );
}
