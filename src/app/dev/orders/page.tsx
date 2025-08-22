// /src/app/dev/orders/page.tsx
'use client';

import useSWR from 'swr';

type Entry = {
  ts: number;
  orderId: string;
  amount: number;
  currency: string;
  payerEmail: string | null;
  customId: string | null;
};

const fetcher = (u: string) => fetch(u).then(r => r.json());

export default function OrdersDevPage() {
  const { data } = useSWR<{ ok: boolean; orders: Entry[] }>('/api/dev/orders', fetcher, { refreshInterval: 5000 });

  const orders = data?.orders ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 text-white">
      <h1 className="text-2xl font-semibold">Orders (dev)</h1>
      <p className="mt-1 text-sm text-neutral-400">Newest first. Local file in dev, /tmp in prod (ephemeral).</p>

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
                <td className="px-3 py-2">{o.amount.toFixed(2)} {o.currency}</td>
                <td className="px-3 py-2">{o.payerEmail ?? '—'}</td>
                <td className="px-3 py-2">{o.customId ?? '—'}</td>
              </tr>
            ))}
            {orders.length === 0 && (
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
