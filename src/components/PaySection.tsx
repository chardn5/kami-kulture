// /src/components/PaySection.tsx
'use client';

import { useEffect, useRef } from 'react';

// If you're using @paypal/paypal-js:
// import { loadScript } from "@paypal/paypal-js";

type PaySectionProps = {
  amount: number; // in your store currency
  productTitle: string;
  selectedSize?: string;
  productSlug?: string;
  sku?: string;
};

declare global {
  interface Window {
    paypal: any;
  }
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
    // Re-render buttons when size changes so description/custom_id stays in sync
    if (!window.paypal || !containerRef.current) return;

    containerRef.current.innerHTML = '';

    const description = `${productTitle}${selectedSize ? ` - Size: ${selectedSize}` : ''}`;
    const customId = [
      'KK',
      productSlug ?? '',
      selectedSize ?? '',
      sku ?? '',
      // random suffix to avoid duplication in sandbox
      Math.random().toString(36).slice(2, 8),
    ]
      .filter(Boolean)
      .join(':');

    window.paypal
      .Buttons({
        style: {
          shape: 'pill',
          label: 'paypal',
          layout: 'horizontal',
        },
        createOrder: (_data: any, actions: any) => {
          return actions.order.create({
            intent: 'CAPTURE',
            purchase_units: [
              {
                custom_id: customId, // helpful for backoffice
                description,
                amount: {
                  currency_code: 'USD',
                  value: amount.toFixed(2),
                },
                items: [
                  {
                    name: productTitle,
                    description,
                    sku: sku ?? selectedSize ?? 'NA',
                    unit_amount: {
                      currency_code: 'USD',
                      value: amount.toFixed(2),
                    },
                    quantity: '1',
                    category: 'PHYSICAL_GOODS',
                  },
                ],
              },
            ],
          });
        },
        onApprove: async (_data: any, actions: any) => {
          try {
            const details = await actions.order.capture();
            // Optional: fire your own API call / webhook here
            // fetch('/api/order', { method: 'POST', body: JSON.stringify(details) })
            // For now, just log:
            console.log('Approved:', details);
            alert('Payment captured in sandbox. (Check console for details)');
          } catch (e) {
            console.error(e);
            alert('Capture failed in sandbox.');
          }
        },
        onError: (err: any) => {
          console.error('PayPal error', err);
          alert('PayPal error in sandbox.');
        },
      })
      .render(containerRef.current);
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
