// /src/app/dev/orders/page.tsx

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = { robots: { index: false, follow: false } };
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Entry = {
  ts: number;
  orderId: string;
  amount: number;
  currency: string;
  payerEmail: string | null;
  customId: string | null;
};

export default function OrdersDevPage() {
  const [orders, setOrders] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = async () => {
    try {
      const res = await fetch('/api/dev/orders', { cache: 'no-store' });
      if (res.status === 401) {
        router.push(`/dev/login?next=${encodeURIComponent('/dev/orders')}`);
        return;
      }
      const json = (await res.json()) as { ok?: boolean; orders?: Entry[] };
      if (json?.ok && Array.isArray(json.orders)) setOrders(json.orders);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 text-white">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders (dev)</h1>
        <button
          onClick={async () => {
            await fetch('/api/dev/logout', { method: 'POST' });
            router.push('/dev/login');
          }}
          className="rounded-lg bg-neutral-800 px-3 py-1 text-sm text-neutral-200 hover:bg-neutral-700"
          type="button"
        >
          Sign out
        </button>
      </div>

      <p className="text-sm text-neutral-400">
        Newest first. Local file in <code>.data/orders.json</code> (dev), <code>/tmp/orders.json</code> (prod, ephemeral).
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl ring-1 ring-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900/70 text-neutral-300">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Order ID</th>
              <th className="px-3 py-2 text-left">Amount</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Custom ID</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.ts} className="odd:bg-neutral-900/40">
                <td className="px-3 py-2">{new Date(o.ts).toLocaleString()}</td>
                <td className="px-3 py-2 font-mono">{o.orderId}</td>
                <td className="px-3 py-2">
                  {o.amount.toFixed(2)} {o.currency}
                </td>
                <td className="px-3 py-2">{o.payerEmail ?? '—'}</td>
                <td className="px-3 py-2">{o.customId ?? '—'}</td>
              </tr>
            ))}
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-neutral-400">
                  No orders logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
