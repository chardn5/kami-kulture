// /src/components/PaySection.tsx
'use client';

import { useEffect, useRef } from 'react';

type PaySectionProps = {
  amount: number;
  productTitle: string;
  selectedSize?: string;
  productSlug?: string;
  sku?: string;
};

type PayPalOrderActions = {
  create: (input: unknown) => Promise<string>;
  capture: () => Promise<{ id?: string }>;
};
type PayPalButtonsOptions = {
  style?: Record<string, unknown>;
  createOrder: (data: unknown, actions: { order: PayPalOrderActions }) => Promise<string> | string;
  onApprove: (data: { orderID: string }, actions: { order: PayPalOrderActions }) => Promise<void> | void;
  onError?: (err: unknown) => void;
};
type PayPalButtonsInstance = { render: (container: HTMLElement) => void; close?: () => void };
type PayPalSDK = { Buttons: (opts: PayPalButtonsOptions) => PayPalButtonsInstance };

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try { return JSON.stringify(err); } catch { return ''; }
}

/** Load the PayPal SDK once and resolve when ready */
async function loadPayPalSDK(): Promise<PayPalSDK> {
  const w = window as any;
  if (w.paypal) return w.paypal;

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  if (!clientId) throw new Error('NEXT_PUBLIC_PAYPAL_CLIENT_ID is not set');

  const src =
    `https://www.paypal.com/sdk/js?components=buttons&client-id=${encodeURIComponent(clientId)}` +
    `&currency=USD&intent=capture`;

  const existing = Array.from(document.getElementsByTagName('script')).find((s) => s.src === src);
  if (existing) {
    await new Promise<void>((res) => (w.paypal ? res() : existing.addEventListener('load', () => res(), { once: true })));
    if (!w.paypal) throw new Error('PayPal SDK not ready after existing script load');
    return w.paypal;
  }

  await new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    document.head.appendChild(el);
  });

  if (!w.paypal) throw new Error('PayPal SDK loaded but window.paypal is undefined');
  return w.paypal;
}

export default function PaySection({
  amount,
  productTitle,
  selectedSize,
  productSlug,
  sku,
}: PaySectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let buttons: PayPalButtonsInstance | null = null;

    const render = async () => {
      const container = containerRef.current;
      if (!container) return;

      try {
        const paypal = await loadPayPalSDK();
        if (cancelled) return;

        container.innerHTML = '';

        const description = `${productTitle}${selectedSize ? ` - Size: ${selectedSize}` : ''}`;
        const customId = ['KK', productSlug ?? '', selectedSize ?? '', sku ?? '', Math.random().toString(36).slice(2, 8)]
          .filter(Boolean)
          .join(':');

        buttons = paypal.Buttons({
          style: { shape: 'pill', label: 'paypal', layout: 'horizontal' },
          createOrder: (_data, actions) =>
            actions.order.create({
              intent: 'CAPTURE',
              purchase_units: [
                {
                  custom_id: customId,
                  description,
                  amount: { currency_code: 'USD', value: amount.toFixed(2) },
                },
              ],
            }),
          onApprove: async (data: { orderID: string }, actions) => {
  try {
    const details = await actions.order.capture(); // returns { id?: string }
    const orderID = data.orderID || details?.id || '';

    fetch('/api/paypal/verify-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: orderID, expectedAmount: amount, meta: { productTitle, selectedSize, productSlug, sku, customId } }),
    }).catch((e: unknown) => console.error('verify-order failed', e));

    window.location.href = `/thank-you?orderID=${encodeURIComponent(orderID)}`;
  } catch (e: unknown) {
    console.error(e);
    const msg = getErrorMessage(e);
    alert(`Capture failed in sandbox.${msg ? `\n\n${msg}` : ''}`);
  }
},
          onError: (err) => {
            console.error('PayPal onError', err);
            const msg = getErrorMessage(err);
            alert(`PayPal error in sandbox.${msg ? `\n\n${msg}` : ''}`);
          },
        });

        buttons.render(container);
      } catch (err) {
        console.error(err);
      }
    };

    render();

    return () => {
      cancelled = true;
      try { buttons?.close?.(); } catch { /* no-op */ }
    };
  }, [amount, productTitle, selectedSize, productSlug, sku]);

  return (
    <div className="space-y-2">
      {selectedSize && (
        <p className="text-sm text-neutral-300">
          Selected size: <span className="font-medium text-white">{selectedSize}</span>
        </p>
      )}
      <div ref={containerRef} />
      <p className="text-xs text-neutral-500">PayPal Sandbox active.</p>
    </div>
  );
}
