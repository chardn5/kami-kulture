'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import type { ReactPayPalScriptOptions } from '@paypal/react-paypal-js';

const options: ReactPayPalScriptOptions = {
  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
  currency: 'USD',
  intent: 'capture',
};

export default function KamiTeePage() {
  const [status, setStatus] = useState('');
  const router = useRouter();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Kami Tee</h1>

      <div className="mt-4">
        <PayPalScriptProvider options={options}>
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
              const { id } = (await r.json()) as { id: string };
              setStatus('Opening PayPal…');
              return id;
            }}
            onApprove={async (data: { orderID: string }) => {
              try {
                setStatus('Capturing payment…');
                // Server handles capture + email. No client capture to avoid 422.
                const r = await fetch('/api/paypal/capture-order', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    orderID: data.orderID,
                    // use env-based recipient (ORDER_TO_EMAIL); uncomment to force an address while testing:
                    // emailOverride: 'kamikulture99@gmail.com',
                  }),
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
            onError={(err) => {
              console.error(err);
              setStatus('Payment error. Please try again.');
            }}
          />
        </PayPalScriptProvider>
      </div>

      {status && <p className="mt-3 text-sm text-neutral-700">{status}</p>}
    </main>
  );
}
