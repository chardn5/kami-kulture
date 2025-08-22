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

/* --------- Minimal PayPal SDK types (enough for our usage) --------- */
type PayPalOrderActions = {
  create: (input: unknown) => Promise<string>;
  capture: () => Promise<unknown>;
};

type PayPalButtonsOptions = {
  style?: Record<string, unknown>;
  createOrder: (data: unknown, actions: { order: PayPalOrderActions }) => Promise<string> | string;
  onApprove: (data: unknown, actions: { order: PayPalOrderActions }) => Promise<void> | void;
  onError?: (err: unknown) => void;
};

type PayPalButtonsInstance = {
  render: (container: HTMLElement) => void;
  close?: () => void;
};

type PayPalSDK = {
  Buttons: (opts: PayPalButtonsOptions) => PayPalButtonsInstance;
};
/* ------------------------------------------------------------------- */

export default function PaySection({
  amount,
  productTitle,
  selectedSize,
  productSlug,
  sku,
}: PaySectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = typeof window !== 'undefined' ? (window as unknown as { paypal?: PayPalSDK }) : undefined;
    const paypal = w?.paypal;
    const container = containerRef.current;
    if (!paypal || !container) return;

    // Re-render buttons when size changes
    container.innerHTML = '';

    const description = `${productTitle}${selectedSize ? ` - Size: ${selectedSize}` : ''}`;
    const customId = ['KK', productSlug ?? '', selectedSize ?? '', sku ?? '', Math.random().toString(36).slice(2, 8)]
      .filter(Boolean)
      .join(':');

    const buttons = paypal.Buttons({
      style: { shape: 'pill', label: 'paypal', layout: 'horizontal' },
      createOrder: (_data, actions) =>
        actions.order.create({
          intent: 'CAPTURE',
          purchase_units: [
            {
              custom_id: customId,
              description,
              amount: { currency_code: 'USD', value: amount.toFixed(2) },
              items: [
                {
                  name: productTitle,
                  description,
                  sku: sku ?? selectedSize ?? 'NA',
                  unit_amount: { currency_code: 'USD', value: amount.toFixed(2) },
                  quantity: '1',
                  category: 'PHYSICAL_GOODS',
                },
              ],
            },
          ],
        }),
      onApprove: async (_data, actions) => {
        try {
          const details = await actions.order.capture();
          // eslint-disable-next-line no-console
          console.log('Approved:', details);
          alert('Payment captured in sandbox. (Check console for details)');
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
          alert('Capture failed in sandbox.');
        }
      },
      onError: (err) => {
        // eslint-disable-next-line no-console
        console.error('PayPal error', err);
        alert('PayPal error in sandbox.');
      },
    });

    buttons.render(container);

    return () => {
      try {
        buttons.close?.();
      } catch {
        /* no-op */
      }
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
