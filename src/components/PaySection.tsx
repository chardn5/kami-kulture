'use client';

import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  itemTitle: string;
  amount: number;     // USD
  sku: string;        // product slug
};

export default function PaySection({ itemTitle, amount, sku }: Props) {
  const [status, setStatus] = useState('');
  const router = useRouter();

  return (
    <section className="mt-8 rounded-lg border border-white/10 p-4">
      <h2 className="text-sm font-semibold text-white">{itemTitle} — ${amount.toFixed(2)}</h2>
      <p className="text-xs text-slate-400">US-only, PayPal checkout</p>

      <div className="mt-3">
        <PayPalScriptProvider
          options={{
            clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? '',
            currency: 'USD',
            intent: 'capture',
          }}
        >
          <PayPalButtons
            style={{ layout: 'vertical' }}
            createOrder={async () => {
              setStatus('Creating order…');
              const r = await fetch('/api/paypal/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  product: sku,
                  title: itemTitle,
                  amount,
                  qty: 1,
                  currency: 'USD',
                }),
              });
              if (!r.ok) throw new Error('Create failed');
              const { id } = await r.json();
              setStatus('Opening PayPal…');
              return id;
            }}
            onApprove={async (data) => {
              try {
                setStatus('Capturing payment…');
                const r = await fetch('/api/paypal/capture-order', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ orderID: data.orderID }),
                });
                const out = await r.json();
                if (!r.ok || !out.ok) throw new Error(out.error || 'Capture failed');
                setStatus('Payment captured ✅');
                router.push(`/thank-you?orderID=${encodeURIComponent(data.orderID)}`);
              } catch (err) {
                console.error(err);
                setStatus('Payment error. Please try again.');
              }
            }}
            onError={(err) => {
              console.error(err);
              setStatus('Payment error. Please try again.');
            }}
          />
        </PayPalScriptProvider>
      </div>

      {status && <p className="mt-2 text-xs text-slate-300">{status}</p>}
    </section>
  );
}
