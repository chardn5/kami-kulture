'use client';

import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import type { PayPalScriptOptions } from '@paypal/react-paypal-js';

const options: PayPalScriptOptions = {
  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? '', // must be a string
  currency: 'USD',
  intent: 'capture',
};

export default function KamiTeePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      {/* ...product UI... */}
      <div className="mt-4">
        <PayPalScriptProvider options={options}>
          <PayPalButtons
            style={{ layout: 'vertical' }}
            createOrder={async () => {
              const r = await fetch('/api/paypal/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product: 'kami-tee', qty: 1 }),
              });
              const { id } = await r.json();
              return id;
            }}
            onApprove={async (data) => {
              await fetch('/api/paypal/capture-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderID: data.orderID }),
              });
            }}
          />
        </PayPalScriptProvider>
      </div>
    </main>
  );
}
