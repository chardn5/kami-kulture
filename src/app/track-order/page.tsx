'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';

type LookupOk = { found: true; status?: string; amountTotal?: string; currency?: string };
type LookupMiss = { found: false };
type LookupResult = LookupOk | LookupMiss | null;

export default function TrackOrderPage() {
  const [orderID, setOrderID] = useState('');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<LookupResult>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setErr(null);
    try {
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderID, email }),
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
        sessionStorage.setItem('kk_email', email);
      }
    } catch {
      setErr('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-3xl font-bold">Track Order</h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Input
          label="Order ID"
          placeholder="KK-YYMMDD-ABCDE"
          value={orderID}
          onChange={(e) => setOrderID(e.target.value)}
          required
        />
        <Input
          type="email"
          label="Email used at checkout"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button
          className="rounded-md bg-black px-4 py-2 text-white text-sm font-medium disabled:opacity-50"
          disabled={loading || !orderID || !email}
          type="submit"
        >
          {loading ? 'Checking…' : 'Check Status'}
        </button>
      </form>

      {err && <p className="mt-4 text-sm text-red-400">{err}</p>}

      {result && (
        <div className="mt-6 rounded-md border border-white/10 p-4">
          {result.found ? (
            <div>
              {result.status && (
                <p className="text-sm">
                  <span className="text-neutral-400">Status:</span>{' '}
                  <span className="font-semibold text-white">{result.status}</span>
                </p>
              )}
              {result.amountTotal && (
                <p className="text-sm mt-1">
                  <span className="text-neutral-400">Total:</span>{' '}
                  <span className="font-semibold text-white">
                    {result.currency} {Number(result.amountTotal).toFixed(2)}
                  </span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-red-400">No match found for that email and order ID.</p>
          )}
        </div>
      )}
    </main>
  );
}
