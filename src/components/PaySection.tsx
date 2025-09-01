// /src/components/PaySection.tsx
'use client';

import { useEffect, useRef } from 'react';

/* -------- Props -------- */
type PaySectionProps = {
  amount: number;          // major units (e.g., 499.00)
  productTitle: string;
  selectedSize?: string;
  productSlug?: string;
  sku?: string;
};

/* -------- Minimal PayPal SDK & response types (no `any`) -------- */
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
/* ---------------------------------------------------------------- */

const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY ?? 'USD').toUpperCase();

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try { return JSON.stringify(err); } catch { return ''; }
}

/** Load the PayPal SDK once and resolve when ready */
async function loadPayPalSDK(): Promise<PayPalSDK> {
  const w = window as WindowWithPaypal;
  if (w.paypal) return w.paypal;

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  if (!clientId) throw new Error('NEXT_PUBLIC_PAYPAL_CLIENT_ID is not set');

  const src =
    `https://www.paypal.com/sdk/js?components=buttons&client-id=${encodeURIComponent(clientId)}` +
    `&currency=${encodeURIComponent(CURRENCY)}&intent=capture`;

  const existing = Array.from(document.getElementsByTagName('script')).find((s) => s.src === src);
  if (existing) {
    await new Promise<void>((res) => {
      if (w.paypal) res();
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
        // helpful string for admin debug
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
                  amount: { currency_code: CURRENCY, value: amount.toFixed(2) },
                },
              ],
            }),

          onApprove: async (data, actions) => {
            try {
              // Capture on client (sandbox-friendly)
              const details = await actions.order.capture();
              const orderID = data.orderID || details.id || '';

              // Extract payer info & final amount from PayPal response
              const pu0 = details.purchase_units?.[0];
              const cap0 = pu0?.payments?.captures?.[0];
              const amtObj: PayPalAmount | undefined = cap0?.amount ?? pu0?.amount;
              const value = Number(amtObj?.value ?? amount);
              const currency = (amtObj?.currency_code ?? CURRENCY).toUpperCase();
              const given = details.payer?.name?.given_name ?? '';
              const surname = details.payer?.name?.surname ?? '';
              const payerName = `${given} ${surname}`.trim();
              const payerEmail = details.payer?.email_address;

              // Build a single-line "Buy Now" cart payload
              const line = {
                sku: sku ?? `${productSlug ?? productTitle}-${selectedSize ?? 'NA'}`,
                title: productTitle,
                qty: 1,
                price: value,          // major units
                size: selectedSize,
                image: undefined as string | undefined,
              };

              // Send to our capture endpoint (creates Customer/Order/Items + emails)
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
                  paypalRaw: details,
                }),
              });

              type CaptureResponse = { ok: boolean; orderId?: string; error?: string };
              const json: CaptureResponse = await res.json().catch(() => ({ ok: false }));

              if (!res.ok || !json.ok) {
                throw new Error(json.error || `Capture API failed (${res.status})`);
              }

              // Redirect to Thank You with our backend orderId
              const qp = new URLSearchParams({ orderID: json.orderId ?? '' });
if (payerEmail) qp.set('email', payerEmail);
window.location.href = `/thank-you?${qp.toString()}`;
            } catch (e: unknown) {
              console.error(e);
              const msg = getErrorMessage(e);
              alert(`Checkout failed.${msg ? `\n\n${msg}` : ''}`);
            }
          },

          onError: (err: unknown) => {
            console.error('PayPal onError', err);
            const msg = getErrorMessage(err);
            alert(`PayPal error.${msg ? `\n\n${msg}` : ''}`);
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
