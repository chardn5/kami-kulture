// src/app/checkout/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/lib/cartStore';
import { formatPrice } from '@/lib/format';
import { loadPayPalSDK } from '@/lib/paypalClient';
import CheckoutForm, { type CheckoutFormValues } from '@/components/CheckoutForm';

/* ---- Minimal PayPal types ---- */
type PPAmount = { value?: string; currency_code?: string };
type PPName = { given_name?: string; surname?: string };
type PPPayer = { email_address?: string; name?: PPName };
type PPCapture = { id?: string; amount?: PPAmount; status?: string };
type PPPayments = { captures?: PPCapture[] };
type PPPurchaseUnit = { amount?: PPAmount; payments?: PPPayments };
type PPOrder = { id?: string; payer?: PPPayer; purchase_units?: PPPurchaseUnit[] };

type PayPalOrderActions = {
  create: (input: unknown) => Promise<string>;
  capture: () => Promise<unknown>;
};

type PayPalButtonsInstance = {
  render: (container: HTMLElement) => void;
  isEligible?: () => boolean;
  close?: () => void;
};
/* -------------------------------- */

const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY ?? 'USD').toUpperCase();

const safe = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);

function isUSZip(s?: string | null) {
  if (!s) return false;
  return /^\d{5}(-\d{4})?$/.test(s.trim());
}

/** Normalize human input to ISO-2 country code PayPal accepts */
function normalizeCountryCode(input?: string | null): string | null {
  if (!input) return null;
  const s = input.trim().toUpperCase();
  if (s.length === 2) return s;
  const map: Record<string, string> = {
    USA: 'US',
    'UNITED STATES': 'US',
    'UNITED STATES OF AMERICA': 'US',
    PHL: 'PH',
    PHILIPPINES: 'PH',
    UK: 'GB',
    GBR: 'GB',
    'UNITED KINGDOM': 'GB',
    ENGLAND: 'GB',
    SCOTLAND: 'GB',
    WALES: 'GB',
    CANADA: 'CA',
    AUS: 'AU',
    AUSTRALIA: 'AU',
  };
  return map[s] ?? null;
}

/** Build a PayPal shipping object only when it's valid for the selected country */
function buildShipping(fv: CheckoutFormValues | null) {
  if (!fv) return undefined;
  const cc = normalizeCountryCode(fv.country);
  if (!cc) return undefined;

  // For US, require 2-letter state + valid ZIP; otherwise omit shipping (PayPal will ask inside)
  if (cc === 'US') {
    if (!fv.state || fv.state.length !== 2 || !isUSZip(fv.postalCode)) {
      console.warn('[checkout] Omitting shipping: invalid US state/ZIP', fv.state, fv.postalCode);
      return undefined;
    }
  }

  return {
    name: { full_name: `${safe(fv.firstName) ?? ''} ${safe(fv.lastName) ?? ''}`.trim() || undefined },
    address: {
      address_line_1: safe(fv.address1),
      address_line_2: safe(fv.address2),
      admin_area_2: safe(fv.city),  // city
      admin_area_1: safe(fv.state), // state/province (2-letter for US)
      postal_code: safe(fv.postalCode),
      country_code: cc,
    },
  };
}

export default function CheckoutPage() {
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const paypalRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [formValues, setFormValues] = useState<CheckoutFormValues | null>(null);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.price * i.qty, 0), [items]);
  const shipping = 0;
  const tax = 0;
  const total = subtotal + shipping + tax;

  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    let walletButtons: PayPalButtonsInstance | null = null;
    let cardButtons: PayPalButtonsInstance | null = null;

    const renderButtons = async () => {
      const paypal = await loadPayPalSDK();
      if (cancelled) return;

      const walletContainer = paypalRef.current;
      const cardContainer = cardRef.current;
      if (!walletContainer || !cardContainer) return;

      walletContainer.innerHTML = '';
      cardContainer.innerHTML = '';

      const createOrder = async (_data: unknown, actions: { order: PayPalOrderActions }) => {
        const fv = formValues;
        const shippingObj = buildShipping(fv);

        const purchaseUnit: any = {
          description: `Kami Kulture order (${items.length} item${items.length > 1 ? 's' : ''})`,
          amount: { currency_code: CURRENCY, value: total.toFixed(2) },
          ...(shippingObj ? { shipping: shippingObj } : {}),
        };

        const payload: any = {
          intent: 'CAPTURE',
          purchase_units: [purchaseUnit],
          ...(fv
            ? {
                payer: {
                  email_address: safe(fv.email),
                  name: { given_name: safe(fv.firstName), surname: safe(fv.lastName) },
                },
              }
            : {}),
        };

        try {
          // Helpful for debugging any future address issues
          // console.debug('[paypal] create payload', payload);
          return await actions.order.create(payload);
        } catch (err) {
          console.error('[paypal] actions.order.create failed', err, payload);
          alert('Unable to start PayPal. Please check your address (country/state/postal) and try again.');
          throw err;
        }
      };

      const onApprove = async (data: { orderID: string }, actions: { order: PayPalOrderActions }) => {
        const detailsUnknown = await actions.order.capture();
        const details = detailsUnknown as PPOrder;
        const orderID = data.orderID || details.id || '';

        const pu0 = details.purchase_units?.[0];
        const cap0 = pu0?.payments?.captures?.[0];
        const amtObj: PPAmount | undefined = cap0?.amount ?? pu0?.amount;
        const currency = (amtObj?.currency_code ?? CURRENCY).toUpperCase();
        const given = details.payer?.name?.given_name ?? '';
        const surname = details.payer?.name?.surname ?? '';
        const payerName = `${given} ${surname}`.trim();
        const payerEmail = details.payer?.email_address;

        const lines = items.map((i) => ({
          sku: i.sku,
          title: i.title,
          qty: i.qty,
          price: i.price,
          size: i.size,
          image: i.image,
        }));

        const res = await fetch('/api/orders/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paypalOrderId: orderID,
            cart: lines,
            currency,
            shipping,
            tax,
            payer: { email: payerEmail, name: payerName },
            customer: formValues ?? undefined,
            paypalRaw: detailsUnknown,
          }),
        });

        type CaptureResponse = { ok: boolean; orderId?: string; error?: string };
        const json: CaptureResponse = await res.json().catch(() => ({ ok: false }));

        if (!res.ok || !json.ok) {
          throw new Error(json.error || `Capture API failed (${res.status})`);
        }

        clear();
        const qp = new URLSearchParams({ orderID: json.orderId ?? '' });
        if (payerEmail) qp.set('email', payerEmail);
        window.location.href = `/thank-you?${qp.toString()}`;
      };

      const onError = (err: unknown) => {
        console.error('PayPal onError', err);
        alert('PayPal error. Please try again.');
      };

      // Wallet button
      walletButtons = paypal.Buttons({
        fundingSource: paypal.FUNDING.PAYPAL,
        style: { shape: 'pill', label: 'paypal', layout: 'vertical' },
        createOrder,
        onApprove,
        onError,
      }) as PayPalButtonsInstance;
      walletButtons.render(walletContainer);

      // Card button
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
    };

    renderButtons();

    return () => {
      cancelled = true;
      try { walletButtons?.close?.(); } catch {}
      try { cardButtons?.close?.(); } catch {}
    };
  }, [items, subtotal, total, clear, formValues]);

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-neutral-400">Add something you like and come back to checkout.</p>
        <div className="mt-6">
          <Link href="/products" className="inline-flex items-center rounded-md border px-4 py-2 text-sm hover:bg-white/5">
            Browse products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <h1 className="text-2xl font-semibold">Checkout</h1>

      {/* Customer details */}
      <section className="rounded-lg border border-white/10 p-4">
        <h2 className="mb-4 text-lg font-medium">Customer details</h2>
        <CheckoutForm onValidChange={setFormValues} />
        <p className="mt-2 text-xs text-neutral-500">
          {formValues ? 'Form valid' : 'Form incomplete'}
        </p>
      </section>

      {/* Cart + PayPal */}
      <section>
        {/* Cart items */}
        <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
          {items.map((i) => (
            <li key={`${i.sku}-${i.size ?? ''}`} className="flex items-center gap-3 p-4">
              <div className="relative h-16 w-16 overflow-hidden rounded bg-neutral-900">
                {i.image ? <Image src={i.image} alt={i.title} fill className="object-cover" /> : null}
              </div>
              <div className="flex-1">
                <p className="font-medium">{i.title}</p>
                <p className="text-xs text-neutral-400">
                  {i.size ? <>Size: {i.size} · </> : null}SKU: {i.sku}
                </p>
              </div>
              <div className="text-sm text-neutral-300">
                x{i.qty} · {formatPrice(i.price)}
              </div>
            </li>
          ))}
        </ul>

        {/* Totals */}
        <div className="mt-6 space-y-1 text-sm">
          <div className="flex justify-between text-neutral-400">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-neutral-400">
            <span>Shipping</span>
            <span>{formatPrice(shipping)}</span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-1 font-semibold text-white">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        {/* PayPal */}
        <div
          className={`mt-6 space-y-2 transition-opacity ${
            formValues ? 'opacity-100' : 'opacity-40 pointer-events-none'
          }`}
        >
          <div ref={paypalRef} />
          <div ref={cardRef} />
          <p className="mt-2 text-xs text-neutral-500">PayPal Sandbox active.</p>
          {!formValues && (
            <p className="text-xs text-red-500">Fill in your details to enable payment.</p>
          )}
        </div>
      </section>
    </main>
  );
}
