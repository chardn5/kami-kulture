'use client';

import { useState } from 'react';

export default function TrackOrderPage() {
  const [orderID, setOrderID] = useState('');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<null | { found: boolean; status?: string; amountTotal?: string; currency?: string; }>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderID, email }),
      });
      const json = await res.json();
      setResult(json);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Track Order</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="PayPal Order ID"
          value={orderID}
          onChange={e => setOrderID(e.target.value)}
          required
        />
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Email used at checkout"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <button className="rounded px-4 py-2 bg-black text-white disabled:opacity-50" disabled={loading}>
          {loading ? 'Checking…' : 'Check Status'}
        </button>
      </form>

      {result && (
        <div className="mt-6">
          {result.found ? (
            <div>
              <p>Status: <b>{result.status}</b></p>
              {'amountTotal' in result && result.amountTotal ? (
                <p>Total: {result.currency} {result.amountTotal}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-red-600">No match found for that email & order ID.</p>
          )}
        </div>
      )}
    </main>
  );
}
