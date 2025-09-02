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
  capture: () => Promise<PayPalOrderDetails>;
};

type PayPalButtonsOptions = {
  fundingSource?: unknown;
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

type PayPalButtonsInstance = { render: (container: HTMLElement) => void; isEligible: () => boolean; close?: () => void };
type PayPalSDK = {
  Buttons: (opts: PayPalButtonsOptions) => PayPalButtonsInstance;
  FUNDING: { CARD: unknown };
};
type WindowWithPaypal = Window & { paypal?: PayPalSDK };
/* ---------------------------------------------------------------- */

const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY ?? 'USD').toUpperCase();

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try { return JSON.stringify(err); } catch { return ''; }
}

/** Build the desired SDK URL */
function buildSdkSrc(clientId: string) {
  const base = 'https://www.paypal.com/sdk/js';
  const params =
    `components=buttons&client-id=${encodeURIComponent(clientId)}` +
    `&currency=${encodeURIComponent(CURRENCY)}&intent=capture&enable-funding=card`;
  return `${base}?${params}`;
}

/** Load (or reload) the PayPal SDK with the *desired* params.
 * If a different paypal SDK is already on the page, remove it and inject the correct one.
 */
async function loadPayPalSDK(): Promise<PayPalSDK> {
  const w = window as WindowWithPaypal;

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  if (!clientId) throw new Error('NEXT_PUBLIC_PAYPAL_CLIENT_ID is not set');

  const desiredSrc = buildSdkSrc(clientId);

  // Find any paypal sdk scripts
  const existingScripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[src*="paypal.com/sdk/js"]'));
  const exact = existingScripts.find(s => s.src === desiredSrc);

  // If wrong/missing params, remove them so we can inject the correct one
  if (!exact && existingScripts.length) {
    existingScripts.forEach(s => s.parentElement?.removeChild(s));
    // Also drop the cached global so PayPal fully re-initializes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (w as any).paypal = undefined;
  }

  // If already loaded correctly, just wait for it
  if (exact) {
    if (w.paypal) return w.paypal;
    await new Promise<void>((res, rej) => {
      exact.addEventListener('load', () => res(), { once: true });
      exact.addEventListener('error', () => rej(new Error('Failed loading PayPal SDK')), { once: true });
    });
    if (!w.paypal) throw new Error('PayPal SDK not ready after existing script load');
    return w.paypal!;
  }

  // Inject fresh
  await new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = desiredSrc;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    document.head.appendChild(el);
  });

  const paypal = (w as WindowWithPaypal).paypal;
  if (!paypal) throw new Error('PayPal SDK loaded but window.paypal is undefined');
  return paypal;
}

export default function PaySection({
  amount,
  productTitle,
  selectedSize,
  productSlug,
  sku,
}: PaySectionProps) {
  const paypalRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

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

        const description = `${productTitle}${selectedSize ? ` - Size: ${selectedSize}` : ''}`;
        const customId = [sku ?? '', selectedSize ?? '', productSlug ?? '', Math.random().toString(36).slice(2, 8)]
          .filter(Boolean)
          .join('|');

        const createOrder = (_data: unknown, actions: { order: PayPalOrderActions }) =>
          actions.order.create({
            intent: 'CAPTURE',
            purchase_units: [
              {
                custom_id: customId,
                description,
                amount: { currency_code: CURRENCY, value: amount.toFixed(2) },
              },
            ],
          });

        const onApprove = async (data: { orderID: string }, actions: { order: PayPalOrderActions }) => {
          try {
            const details = await actions.order.capture();
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
                paypalRaw: details,
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

        // 1) PayPal wallet button
        walletButtons = paypal.Buttons({
          style: { layout: 'vertical', shape: 'pill', label: 'paypal' },
          createOrder,
          onApprove,
          onError,
        });
        walletButtons.render(walletContainer);

        // 2) Dedicated Card button (shows only if eligible)
        cardButtons = paypal.Buttons({
          fundingSource: paypal.FUNDING.CARD,
          style: { layout: 'vertical', shape: 'pill' },
          createOrder,
          onApprove,
          onError,
        });
        if (cardButtons.isEligible()) cardButtons.render(cardContainer);
      } catch (err: unknown) {
        console.error(err);
      }
    };

    render();

    return () => {
      cancelled = true;
      try { walletButtons?.close?.(); } catch {}
      try { cardButtons?.close?.(); } catch {}
    };
  }, [amount, productTitle, selectedSize, productSlug, sku]);

  return (
    <div className="space-y-2">
      {selectedSize && (
        <p className="text-sm text-neutral-300">
          Selected size: <span className="font-medium text-white">{selectedSize}</span>
        </p>
      )}

      {/* Render PayPal wallet + Card as two separate containers */}
      <div ref={paypalRef} />
      <div ref={cardRef} />

      <p className="text-xs text-neutral-500">PayPal Sandbox active.</p>
    </div>
  );
}
