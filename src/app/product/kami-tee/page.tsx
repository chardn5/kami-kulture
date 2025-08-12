'use client';

import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import type { ReactPayPalScriptOptions } from '@paypal/react-paypal-js';

const options: ReactPayPalScriptOptions = {
  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? 'AQZOPq6P2KwuDeAAWN2FDTytXuE7VkH8_MCfuvP8CyOTnS4UZSaC1pbk1y2I_8GCFa6qX-bVSktszrET',
  currency: 'USD',
  intent: 'capture',
};

export default function KamiTeePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Kami Tee</h1>
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
