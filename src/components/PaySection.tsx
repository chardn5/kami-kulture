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

/* --------- Minimal PayPal SDK & response types (no `any`) --------- */
type PayPalAmount = { value: string; currency_code?: string };
type PayPalCapture = { id?: string; amount?: PayPalAmount; status?: string };
type PayPalPayments = { captures?: PayPalCapture[] };
type PayPalPurchaseUnit = {
  custom_id?: string;
  description?: string;
  amount?: PayPalAmount;
  payments?: PayPalPayments;
};
type PayPalPayer = { email_address?: string };
type PayPalOrderDetails = {
  id?: string;
  payer?: PayPalPayer;
  purchase_units?: PayPalPurchaseUnit[];
};

type PayPalOrderActions = {
  create: (input: unknown) => Promise<string>;
  capture: () => Promise<PayPalOrderDetails>;
};

type PayPalButtonsOptions = {
  style?: Record<string, unknown>;
  createOrder: (
    data: unknown,
    actions: { order: PayPalOrderActions }
  ) => Promise<string> | string;
  onApprove: (
    data: { orderID: string },
    actions: { order: PayPalOrderActions }
  ) => Promise<void> | void;
  onError?: (err: unknown) => void;
};

type PayPalButtonsInstance = { render: (container: HTMLElement) => void; close?: () => void };
type PayPalSDK = { Buttons: (opts: PayPalButtonsOptions) => PayPalButtonsInstance };
type WindowWithPaypal = Window & { paypal?: PayPalSDK };
/* ------------------------------------------------------------------ */

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return '';
  }
}

/** Load the PayPal SDK once and resolve when ready */
async function loadPayPalSDK(): Promise<PayPalSDK> {
  const w = window as WindowWithPaypal;
  if (w.paypal) return w.paypal;

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  if (!clientId) throw new Error('NEXT_PUBLIC_PAYPAL_CLIENT_ID is not set');

  const src =
    `https://www.paypal.com/sdk/js?components=buttons&client-id=${encodeURIComponent(clientId)}` +
    `&currency=USD&intent=capture`;

  const existing = Array.from(document.getElementsByTagName('script')).find((s) => s.src === src);
  if (existing) {
    await new Promise<void>((res) => {
      if ((w as WindowWithPaypal).paypal) res();
      else existing.addEventListener('load', () => res(), { once: true });
    });
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
        // sku|size|slug|rand — helpful string in admin
        const customId = [sku ?? '', selectedSize ?? '', productSlug ?? '', Math.random().toString(36).slice(2, 8)]
          .filter(Boolean)
          .join('|');

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

          onApprove: async (data, actions) => {
            try {
              // Capture on client (OK for sandbox/MVP)
              const details = await actions.order.capture(); // typed as PayPalOrderDetails
              const orderID = data.orderID || details.id || '';

              // Extract amounts safely
              const pu0 = (details.purchase_units && details.purchase_units[0]) as
                | PayPalPurchaseUnit
                | undefined;

              const cap0 =
                (pu0?.payments?.captures && pu0.payments.captures[0]) as PayPalCapture | undefined;

              const amtObj: PayPalAmount | undefined = cap0?.amount ?? pu0?.amount ?? undefined;
              const value: string = amtObj?.value ?? amount.toFixed(2);
              const currency: string = amtObj?.currency_code ?? 'USD';
              const payerEmail: string | undefined = details.payer?.email_address;

              // (A) Optional verification (non‑blocking)
              fetch('/api/paypal/verify-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: orderID,
                  expectedAmount: amount,
                  meta: { productTitle, selectedSize, productSlug, sku, customId },
                }),
              }).catch(() => {});

              // (B) Append to local orders log → shows in admin/dev
              fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: orderID,
                  amount: value,
                  currency,
                  email: payerEmail,
                  customId,
                }),
                keepalive: true,
              }).catch(() => {});

              window.location.href = `/thank-you?orderID=${encodeURIComponent(orderID)}`;
            } catch (e: unknown) {
              console.error(e);
              const msg = getErrorMessage(e);
              alert(`Capture failed in sandbox.${msg ? `\n\n${msg}` : ''}`);
            }
          },

          onError: (err: unknown) => {
            console.error('PayPal onError', err);
            const msg = getErrorMessage(err);
            alert(`PayPal error in sandbox.${msg ? `\n\n${msg}` : ''}`);
          },
        });

        buttons.render(container);
      } catch (err: unknown) {
        console.error(err);
      }
    };

    render();

    return () => {
      cancelled = true;
      try {
        buttons?.close?.();
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
