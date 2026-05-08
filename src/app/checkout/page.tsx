// src/app/checkout/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/lib/cartStore';
import { formatPrice } from '@/lib/format';
import { loadPayPalSDK } from '@/lib/paypalClient';
import CheckoutForm, { type NormalizedCheckout } from '@/components/CheckoutForm';

/* --------------------- Minimal, explicit types --------------------- */
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

type PayPalButtonStyle = {
  shape?: 'pill' | 'rect';
  label?: 'paypal' | 'checkout' | 'pay' | 'buynow' | 'installment';
  layout?: 'vertical' | 'horizontal';
};

// Proper typing for onClick
type PayPalOnClickActions = { resolve: () => void; reject: () => void };
type PayPalOnClick = (data: unknown, actions: PayPalOnClickActions) => void;

type PayPalButtonOptions = {
  fundingSource?: string;
  style?: PayPalButtonStyle;
  onClick?: PayPalOnClick;
  createOrder: (data: unknown, actions: { order: PayPalOrderActions }) => Promise<string>;
  onApprove: (data: { orderID: string }, actions: { order: PayPalOrderActions }) => Promise<void>;
  onError?: (err: unknown) => void;
};

type PayPalSDK = {
  Buttons: (opts: PayPalButtonOptions) => PayPalButtonsInstance;
  FUNDING: { PAYPAL: string; CARD: string };
};
/* ------------------------------------------------------------------- */

const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY ?? 'USD').toUpperCase();

export default function CheckoutPage() {
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const paypalRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [formValues, setFormValues] = useState<NormalizedCheckout | null>(null);

  // Keep a ref so we don't re-render Buttons when the form changes
  const formRef = useRef<NormalizedCheckout | null>(null);
  useEffect(() => {
    formRef.current = formValues;
  }, [formValues]);

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
      const paypal = (await loadPayPalSDK()) as unknown as PayPalSDK;
      if (cancelled) return;

      const walletContainer = paypalRef.current;
      const cardContainer = cardRef.current;
      if (!walletContainer || !cardContainer) return;

      walletContainer.innerHTML = '';
      cardContainer.innerHTML = '';

      // ---- Create order via server with items + payer + shipping ----
      type CreateOrderBody = {
        currency: string;
        items: Array<{
          name: string;
          sku?: string;
          unit_amount: { currency_code: string; value: number };
          quantity: number;
          category?: 'PHYSICAL_GOODS' | 'DIGITAL_GOODS';
        }>;
        payer?: { email_address?: string; name?: { given_name?: string; surname?: string } };
        shipping?: {
          name?: { full_name?: string };
          address: {
            address_line_1?: string;
            address_line_2?: string;
            admin_area_1?: string;
            admin_area_2?: string;
            postal_code?: string;
            country_code: string;
          };
        };
      };

      const createOrder = async () => {
        const fv = formRef.current;

        const body: CreateOrderBody = {
          currency: CURRENCY,
          items: items.map((i) => ({
            name: i.title,
            sku: i.sku,
            unit_amount: { currency_code: CURRENCY, value: i.price },
            quantity: i.qty,
            category: 'PHYSICAL_GOODS',
          })),
          ...(fv && {
            payer: {
              email_address: fv.email,
              name: { given_name: fv.firstName, surname: fv.lastName },
            },
            shipping: {
              name: { full_name: `${fv.firstName} ${fv.lastName}` },
              address: {
                address_line_1: fv.address1 || undefined,
                address_line_2: fv.address2 || undefined,
                admin_area_2: fv.city || undefined,
                admin_area_1: fv.state || undefined, // 2-letter for US
                postal_code: fv.postalCode || undefined,
                country_code: fv.country.toUpperCase(),
              },
            },
          }),
        };

        const res = await fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data: { ok?: boolean; id?: string; error?: string } = await res.json();
        if (!res.ok || !data?.id) {
          console.error('create-order API failed:', data);
          throw new Error(data?.error || `HTTP ${res.status}`);
        }
        return data.id;
      };

      const onApprove = async (data: { orderID: string }, actions: { order: PayPalOrderActions }) => {
        const detailsUnknown = await actions.order.capture();
        const details = detailsUnknown as PPOrder;
        const paypalOrderId = details.id ?? data.orderID;

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
          color: i.color,
          image: i.image,
          printifyProductId: i.printifyProductId,
          printifyVariantId: i.printifyVariantId,
        }));

        const res = await fetch('/api/orders/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paypalOrderId,
            cart: lines,
            currency,
            shipping,
            tax,
            payer: { email: payerEmail, name: payerName },
            customer: formRef.current ?? undefined,
            paypalRaw: detailsUnknown,
          }),
        });

        const json: { ok: boolean; orderId?: string; error?: string } = await res
          .json()
          .catch(() => ({ ok: false }));
        if (!res.ok || !json.ok) throw new Error(json.error || `Capture API failed (${res.status})`);

        clear();
        const qp = new URLSearchParams({ orderID: json.orderId ?? '' });
        const emailForLookup = payerEmail ?? formRef.current?.email;
        if (emailForLookup) qp.set('email', emailForLookup);
        window.location.href = `/thank-you?${qp.toString()}`;
      };

      const onError = (err: unknown) => {
        console.error('PayPal onError', err);
        alert('PayPal error. Please try again.');
      };

      // Gate clicks with onClick instead of re-rendering buttons on form change
      const onClick: PayPalOnClick = (_data, actions) => {
        if (!formRef.current) return actions.reject();
        return actions.resolve();
      };

      // Wallet button
      walletButtons = paypal.Buttons({
        fundingSource: paypal.FUNDING.PAYPAL,
        style: { shape: 'pill', label: 'paypal', layout: 'vertical' },
        onClick,
        createOrder,
        onApprove,
        onError,
      });
      walletButtons.render(walletContainer);

      // Card button
      cardButtons = paypal.Buttons({
        fundingSource: paypal.FUNDING.CARD,
        style: { layout: 'vertical', shape: 'pill' },
        onClick,
        createOrder,
        onApprove,
        onError,
      });
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

    // Keep buttons stable: don't depend on formValues here
  }, [items, subtotal, total, clear]);

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-neutral-400">Add something you like and come back to checkout.</p>
        <div className="mt-6">
          <Link
            href="/products"
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm hover:bg-white/5"
          >
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
            <li key={`${i.sku}-${i.color ?? ''}-${i.size ?? ''}`} className="flex items-center gap-3 p-4">
              <div className="relative h-16 w-16 overflow-hidden rounded bg-neutral-900">
                {i.image ? <Image src={i.image} alt={i.title} fill className="object-contain" /> : null}
              </div>
              <div className="flex-1">
                <p className="font-medium">{i.title}</p>
                <p className="text-xs text-neutral-400">
                  {[i.color ? `Color: ${i.color}` : '', i.size ? `Size: ${i.size}` : '', `SKU: ${i.sku}`]
                    .filter(Boolean)
                    .join(' · ')}
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
