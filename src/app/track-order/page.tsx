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
    <main className="kk-container max-w-lg py-12">
      <p className="text-sm font-black uppercase text-[#ff4f5f]">Order status</p>
      <h1 className="mt-2 text-3xl font-black">Track Order</h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-5">
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
          className="kk-focus rounded-md bg-[#f7f1df] px-4 py-2 text-sm font-black text-black disabled:opacity-50"
          disabled={loading || !orderID || !email}
          type="submit"
        >
          {loading ? 'Checking...' : 'Check Status'}
        </button>
      </form>

      {err && <p className="mt-4 text-sm text-[#ff4f5f]">{err}</p>}

      {result && (
        <div className="mt-6 rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-4">
          {result.found ? (
            <div>
              {result.status && (
                <p className="text-sm">
                  <span className="text-[#f7f1df]/58">Status:</span>{' '}
                  <span className="font-semibold text-[#f7f1df]">{result.status}</span>
                </p>
              )}
              {result.amountTotal && (
                <p className="text-sm mt-1">
                  <span className="text-[#f7f1df]/58">Total:</span>{' '}
                  <span className="font-semibold text-[#f7f1df]">
                    {result.currency} {Number(result.amountTotal).toFixed(2)}
                  </span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#ff4f5f]">No match found for that email and order ID.</p>
          )}
        </div>
      )}
    </main>
  );
}
