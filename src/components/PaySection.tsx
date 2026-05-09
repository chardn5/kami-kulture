// /src/components/PaySection.tsx
'use client';

import { useEffect, useRef } from 'react';
import { loadPayPalSDK } from '@/lib/paypalClient';

/* -------- Props -------- */
type PaySectionProps = {
  amount: number;          // major units (e.g., 499.00)
  productTitle: string;
  selectedSize?: string;
  selectedColor?: string;
  productSlug?: string;
  sku?: string;
  image?: string;
  printifyProductId?: string;
  printifyVariantId?: number;
  /** If true, hides the small sandbox label (default true in prod). */
  hideSandboxNote?: boolean;
};

type PayPalButtonsInstance = {
  render: (container: HTMLElement) => void;
  /** Optional on some SDK builds */
  isEligible?: () => boolean;
  close?: () => void;
};
/* ---------------------------------------------------------------- */

const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY ?? 'USD').toUpperCase();
// Assume sandbox unless explicitly set to "live"
const IS_SANDBOX = (process.env.NEXT_PUBLIC_PAYPAL_ENV ?? 'sandbox') !== 'live';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try { return JSON.stringify(err); } catch { return ''; }
}

export default function PaySection({
  amount,
  productTitle,
  selectedSize,
  selectedColor,
  productSlug,
  sku,
  image,
  printifyProductId,
  printifyVariantId,
  hideSandboxNote = true, // hide by default so no “PayPal Sandbox active.” label
}: PaySectionProps) {
  const paypalRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  /** Keep latest values without re-rendering buttons on every change */
  const latest = useRef({
    amount,
    productTitle,
    selectedSize,
    selectedColor,
    productSlug,
    sku,
    image,
    printifyProductId,
    printifyVariantId,
  });
  useEffect(() => {
    latest.current = {
      amount,
      productTitle,
      selectedSize,
      selectedColor,
      productSlug,
      sku,
      image,
      printifyProductId,
      printifyVariantId,
    };
  }, [
    amount,
    productTitle,
    selectedSize,
    selectedColor,
    productSlug,
    sku,
    image,
    printifyProductId,
    printifyVariantId,
  ]);

  useEffect(() => {
    let cancelled = false;
    let walletButtons: PayPalButtonsInstance | null = null;
    let cardButtons: PayPalButtonsInstance | null = null;

    const render = async () => {
      const walletContainer = paypalRef.current;
      const cardContainer = cardRef.current;
      if (!walletContainer || !cardContainer) return;

      try {
        const paypal = await loadPayPalSDK();
        if (cancelled) return;

        walletContainer.innerHTML = '';
        cardContainer.innerHTML = '';

        const createOrder = async () => {
          const { amount, productTitle, selectedSize, selectedColor, productSlug, sku } = latest.current;
          const options = [
            selectedColor ? `Color: ${selectedColor}` : '',
            selectedSize ? `Size: ${selectedSize}` : '',
          ].filter(Boolean).join(', ');
          const description = `${productTitle}${options ? ` - ${options}` : ''}`;

          const res = await fetch('/api/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currency: CURRENCY,
              items: [
                {
                  name: description,
                  sku: sku ?? `${productSlug ?? productTitle}-${selectedSize ?? 'NA'}`,
                  unit_amount: { currency_code: CURRENCY, value: amount },
                  quantity: 1,
                  category: 'PHYSICAL_GOODS',
                },
              ],
            }),
          });
          const json: { ok?: boolean; id?: string; error?: string } = await res.json();
          if (!res.ok || !json.id) throw new Error(json.error || `Create order failed (${res.status})`);
          return json.id;
        };

        const onApprove = async (data: { orderID: string }) => {
          const {
            amount,
            productTitle,
            selectedSize,
            selectedColor,
            productSlug,
            sku,
            image,
            printifyProductId,
            printifyVariantId,
          } = latest.current;
          try {
            const orderID = data.orderID;
            if (!orderID) throw new Error('Missing PayPal order ID');

            const line = {
              sku: sku ?? `${productSlug ?? productTitle}-${selectedSize ?? 'NA'}`,
              title: productTitle,
              qty: 1,
              price: amount,
              size: selectedSize,
              color: selectedColor,
              image,
              printifyProductId,
              printifyVariantId,
            };

            const res = await fetch('/api/orders/capture', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paypalOrderId: orderID,
                cart: [line],
                currency: CURRENCY,
                shipping: 0,
                tax: 0,
              }),
            });

            type CaptureResponse = { ok: boolean; orderId?: string; error?: string };
            const json: CaptureResponse = await res.json().catch(() => ({ ok: false }));

            if (!res.ok || !json.ok) {
              throw new Error(json.error || `Capture API failed (${res.status})`);
            }

            const qp = new URLSearchParams({ orderID: json.orderId ?? '' });
            window.location.href = `/thank-you?${qp.toString()}`;
          } catch (e: unknown) {
            console.error(e);
            const msg = getErrorMessage(e);
            alert(`Checkout failed.${msg ? `\n\n${msg}` : ''}`);
          }
        };

        const onError = (err: unknown) => {
          console.error('PayPal onError', err);
          const msg = getErrorMessage(err);
          alert(`PayPal error.${msg ? `\n\n${msg}` : ''}`);
        };

        // 1) PayPal wallet button (wallet-only to avoid duplicate Card)
        walletButtons = paypal.Buttons({
          fundingSource: paypal.FUNDING.PAYPAL,
          style: { layout: 'vertical', shape: 'pill', label: 'paypal' },
          createOrder,
          onApprove,
          onError,
        }) as PayPalButtonsInstance;
        walletButtons.render(walletContainer);

        // 2) Dedicated Card button (shows only if eligible)
        cardButtons = paypal.Buttons({
          fundingSource: paypal.FUNDING.CARD,
          style: { layout: 'vertical', shape: 'pill' },
          createOrder,
          onApprove,
          onError,
        }) as PayPalButtonsInstance;

        if (cardButtons.isEligible?.()) {
          cardButtons.render(cardContainer);
        }
      } catch (err: unknown) {
        console.error(err);
      }
    };

    // Run once on mount; buttons stay mounted (fast when size changes)
    render();

    return () => {
      cancelled = true;
      try { walletButtons?.close?.(); } catch {}
      try { cardButtons?.close?.(); } catch {}
    };
  }, []);

    return (
    <div className="space-y-3">
      {(selectedColor || selectedSize) && (
        <p className="text-sm text-[#f7f1df]/68">
          Selected:{' '}
          <span className="font-semibold text-[#f7f1df]">
            {[selectedColor, selectedSize].filter(Boolean).join(' / ')}
          </span>
        </p>
      )}

      {/* Force light color-scheme so PayPal renders its intended styling */}
      <div ref={paypalRef} style={{ colorScheme: 'light' }} />
      <div ref={cardRef} style={{ colorScheme: 'light' }} />

      {/* Hide the sandbox note unless you explicitly want it */}
      {!hideSandboxNote && IS_SANDBOX && (
        <p className="text-xs text-[#f7f1df]/42">PayPal Sandbox active.</p>
      )}
    </div>
  );

}
