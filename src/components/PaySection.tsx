// /src/components/PaySection.tsx
'use client';

import { useEffect, useRef } from 'react';
import { loadPayPalSDK } from '@/lib/paypalClient';

/* -------- Props -------- */
type PaySectionProps = {
  amount: number;          // major units (e.g., 499.00)
  productTitle: string;
  selectedSize?: string;
  productSlug?: string;
  sku?: string;
  /** If true, hides the small sandbox label (default true in prod). */
  hideSandboxNote?: boolean;
};

/* -------- Minimal PayPal SDK & response types -------- */
type PayPalAmount = { value: string; currency_code?: string };
type PayPalCapture = { id?: string; amount?: PayPalAmount; status?: string };
type PayPalPayments = { captures?: PayPalCapture[] };
type PayPalPurchaseUnit = {
  custom_id?: string;
  description?: string;
  amount?: PayPalAmount;
  payments?: PayPalPayments;
};
type PayPalPayerName = { given_name?: string; surname?: string };
type PayPalPayer = { email_address?: string; name?: PayPalPayerName };
type PayPalOrderDetails = {
  id?: string;
  payer?: PayPalPayer;
  purchase_units?: PayPalPurchaseUnit[];
};

type PayPalOrderActions = {
  create: (input: unknown) => Promise<string>;
  /** Must match paypalClient.ts */
  capture: () => Promise<unknown>;
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
  productSlug,
  sku,
  hideSandboxNote = true, // hide by default so no “PayPal Sandbox active.” label
}: PaySectionProps) {
  const paypalRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  /** Keep latest values without re-rendering buttons on every change */
  const latest = useRef({
    amount,
    productTitle,
    selectedSize,
    productSlug,
    sku,
  });
  useEffect(() => {
    latest.current = { amount, productTitle, selectedSize, productSlug, sku };
  }, [amount, productTitle, selectedSize, productSlug, sku]);

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

        const createOrder = (_data: unknown, actions: { order: PayPalOrderActions }) => {
          const { amount, productTitle, selectedSize, productSlug, sku } = latest.current;
          const description = `${productTitle}${selectedSize ? ` - Size: ${selectedSize}` : ''}`;
          const customId = [
            sku ?? '',
            selectedSize ?? '',
            productSlug ?? '',
            Math.random().toString(36).slice(2, 8),
          ].filter(Boolean).join('|');

          return actions.order.create({
            intent: 'CAPTURE',
            purchase_units: [
              {
                custom_id: customId,
                description,
                amount: { currency_code: CURRENCY, value: amount.toFixed(2) },
              },
            ],
          });
        };

        const onApprove = async (data: { orderID: string }, actions: { order: PayPalOrderActions }) => {
          const { amount, productTitle, selectedSize, productSlug, sku } = latest.current;
          try {
            const detailsUnknown = await actions.order.capture();
            const details = detailsUnknown as PayPalOrderDetails;
            const orderID = data.orderID || details.id || '';

            const pu0 = details.purchase_units?.[0];
            const cap0 = pu0?.payments?.captures?.[0];
            const amtObj: PayPalAmount | undefined = cap0?.amount ?? pu0?.amount;
            const value = Number(amtObj?.value ?? amount);
            const currency = (amtObj?.currency_code ?? CURRENCY).toUpperCase();
            const given = details.payer?.name?.given_name ?? '';
            const surname = details.payer?.name?.surname ?? '';
            const payerName = `${given} ${surname}`.trim();
            const payerEmail = details.payer?.email_address;

            const line = {
              sku: sku ?? `${productSlug ?? productTitle}-${selectedSize ?? 'NA'}`,
              title: productTitle,
              qty: 1,
              price: value,
              size: selectedSize,
              image: undefined as string | undefined,
            };

            const res = await fetch('/api/orders/capture', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paypalOrderId: orderID,
                cart: [line],
                currency,
                shipping: 0,
                tax: 0,
                payer: { email: payerEmail, name: payerName },
                paypalRaw: detailsUnknown, // keep raw response
              }),
            });

            type CaptureResponse = { ok: boolean; orderId?: string; error?: string };
            const json: CaptureResponse = await res.json().catch(() => ({ ok: false }));

            if (!res.ok || !json.ok) {
              throw new Error(json.error || `Capture API failed (${res.status})`);
            }

            const qp = new URLSearchParams({ orderID: json.orderId ?? '' });
            if (payerEmail) qp.set('email', payerEmail);
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
    <div className="space-y-2">
      {selectedSize && (
        <p className="text-sm text-neutral-300">
          Selected size: <span className="font-medium text-white">{selectedSize}</span>
        </p>
      )}

      <div ref={paypalRef} />
      <div ref={cardRef} />

      {/* Hide the sandbox note unless you explicitly want it */}
      {!hideSandboxNote && IS_SANDBOX && (
        <p className="text-xs text-neutral-500">PayPal Sandbox active.</p>
      )}
    </div>
  );
}
