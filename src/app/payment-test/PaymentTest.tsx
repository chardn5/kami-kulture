'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { loadPayPalSDK } from '@/lib/paypalClient';
import { PAYMENT_TEST_SKU, PAYMENT_TEST_TITLE, paymentTestContactSchema } from '@/lib/paymentTest';

type Quote = { token: string; expiresAt: number };
type Button = { render: (element: HTMLElement) => void | Promise<void>; close?: () => void };

export default function PaymentTest() {
  const [contact, setContact] = useState({ email: '', firstName: '', lastName: '' });
  const [accepted, setAccepted] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const wallet = useRef<HTMLDivElement>(null);
  const current = useRef({ quote, contact, accepted });
  current.current = { quote, contact, accepted };

  useEffect(() => {
    let cancelled = false;
    let button: Button | undefined;
    void (async () => {
      try {
        const paypal = await loadPayPalSDK();
        if (cancelled || !wallet.current) return;
        button = paypal.Buttons({
          fundingSource: paypal.FUNDING.PAYPAL,
          style: { shape: 'rect', layout: 'vertical', label: 'pay' },
          createOrder: async () => {
            const value = current.current;
            if (!value.accepted || !value.quote || value.quote.expiresAt <= Date.now())
              throw new Error('Confirm the test details again before paying.');
            setBusy(true);
            setError('');
            const response = await fetch('/api/paypal/create-order', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ quoteToken: value.quote.token }),
            });
            const result = await response.json();
            if (!response.ok || !result.id) throw new Error(result.error || 'Could not start payment.');
            return result.id;
          },
          onApprove: async (data: { orderID: string }) => {
            setBusy(true);
            try {
              const response = await fetch('/api/orders/capture', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paypalOrderId: data.orderID }),
              });
              const result = await response.json();
              if (!response.ok || !result.ok) throw new Error(result.error || 'Check the order in admin before trying again.');
              window.location.assign(`/thank-you?${new URLSearchParams({ orderID: result.orderId, email: current.current.contact.email })}`);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Check the order in admin before paying again.');
              setBusy(false);
            }
          },
          onCancel: () => setBusy(false),
          onError: (err: unknown) => { setBusy(false); setError(err instanceof Error ? err.message : 'Payment could not be completed.'); },
        }) as Button;
        await button.render(wallet.current);
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setError('PayPal could not load. Refresh this page to try again.');
      }
    })();
    return () => { cancelled = true; try { button?.close?.(); } catch {} };
  }, []);

  async function prepare(event: React.FormEvent) {
    event.preventDefault();
    const parsed = paymentTestContactSchema.safeParse(contact);
    if (!parsed.success || !accepted) { setError('Enter your name, a valid receipt email, and confirm the test charge.'); return; }
    setBusy(true); setError(''); setQuote(null);
    try {
      const response = await fetch('/api/checkout/quote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer: parsed.data, cart: [{ sku: PAYMENT_TEST_SKU, qty: 1 }] }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not prepare the test charge.');
      setQuote(result);
    } catch (err) { setError(err instanceof Error ? err.message : 'Please try again.'); }
    finally { setBusy(false); }
  }

  return <div className="kk-container max-w-3xl py-10 md:py-16">
    <div className="flex items-center gap-4 border-b border-white/15 pb-6">
      <Image src="/logo.png" alt="Kami Kulture" width={64} height={64} className="rounded" />
      <div><p className="kk-eyebrow">Payment verification</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">Test only - do not purchase</h1></div>
    </div>
    <div className="mt-6 flex gap-3 border-l-2 border-[#ff7885] pl-4 text-sm leading-6" role="note">
      <AlertTriangle size={22} className="mt-1 shrink-0 text-[#ff7885]" />
      <div><p className="font-bold">For controlled checkout verification by the store owner only.</p><p>This charges a real US $1.00. No shirt, digital download, or shipment is included. Use a separate buyer PayPal account, not the merchant account receiving the payment.</p></div>
    </div>
    <dl className="mt-8 divide-y divide-white/15 border-y border-white/15 text-sm">
      <div className="flex justify-between gap-4 py-4"><dt>{PAYMENT_TEST_TITLE}</dt><dd className="shrink-0 font-bold">$1.00</dd></div>
      <div className="flex justify-between py-4"><dt>Shipping</dt><dd>Not applicable</dd></div>
      <div className="flex justify-between py-4 text-lg font-bold"><dt>Total (USD)</dt><dd>$1.00</dd></div>
    </dl>
    <form onSubmit={prepare} className="mt-8 grid gap-4">
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        {(['firstName', 'lastName', 'email'] as const).map(key => <label key={key} className={`grid gap-2 text-sm ${key === 'email' ? 'sm:col-span-2' : ''}`}>
          {key === 'email' ? 'Receipt email' : key === 'firstName' ? 'First name' : 'Last name'}
          <input required type={key === 'email' ? 'email' : 'text'} autoComplete={key === 'email' ? 'email' : key === 'firstName' ? 'given-name' : 'family-name'} maxLength={key === 'email' ? 254 : 100}
            value={contact[key]} onChange={e => { setContact({ ...contact, [key]: e.target.value }); setQuote(null); }} className="h-11 min-w-0 rounded border border-white/20 bg-transparent px-3" />
        </label>)}
      </fieldset>
      <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={accepted} disabled={busy} onChange={e => { setAccepted(e.target.checked); setQuote(null); }} className="mt-1 h-4 w-4 shrink-0" />I understand this is a real $1.00 payment and nothing will be shipped.</label>
      <button disabled={busy || !accepted} className="kk-button justify-self-start disabled:opacity-40" type="submit">{busy ? 'Please wait...' : quote ? 'Refresh test details' : 'Confirm $1.00 test'}</button>
    </form>
    {error && <p role="alert" className="mt-4 text-sm text-[#ff7885]">{error}</p>}
    <div ref={wallet} inert={!quote || !accepted || busy} className={`mt-6 min-h-12 max-w-md ${!quote || !accepted || busy ? 'pointer-events-none opacity-30' : ''}`} style={{ colorScheme: 'light' }} />
    {!ready && !error && <p role="status" className="mt-3 text-sm">Loading PayPal...</p>}
    <p className="mt-5 flex items-center gap-2 text-xs text-white/60"><ShieldCheck size={16} />Real payment. No automatic refund. Your usual shopping cart is unchanged.</p>
  </div>;
}
