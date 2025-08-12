'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

export default function PaySection() {
  const [status, setStatus] = useState('');
  const router = useRouter();

  return (
    <section className="mt-10 rounded-lg border p-6">
      <h2 className="text-xl font-semibold">Kami Tee — $29</h2>
      <p className="text-sm text-neutral-600">US-only, PayPal checkout</p>

      <div className="mt-4">
        <PayPalScriptProvider
          options={{
            clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
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
                body: JSON.stringify({ product: 'kami-tee', qty: 1 }),
              });
              if (!r.ok) throw new Error('Create failed');
              const { id } = await r.json();
              setStatus('Opening PayPal…');
              return id as string;
            }}
            onApprove={async (data: { orderID: string }) => {
              try {
                setStatus('Capturing payment…');
                const r = await fetch('/api/paypal/capture-order', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ orderID: data.orderID }),
                });
                const out = await r.json();
                if (!r.ok || !out.ok) throw new Error(out.error || 'Capture failed');
                setStatus(out.emailSent ? 'Payment captured ✅' : 'Payment captured (email pending) ✅');
                router.push(`/thank-you?orderID=${encodeURIComponent(data.orderID)}`);
              } catch (e) {
                console.error(e);
                setStatus('Payment error. Please try again.');
              }
            }}
            onError={() => setStatus('Payment error. Please try again.')}
          />
        </PayPalScriptProvider>
      </div>

      {status && <p className="mt-3 text-sm text-neutral-700">{status}</p>}
    </section>
  );
}
