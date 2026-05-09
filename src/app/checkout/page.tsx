// src/app/checkout/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart, useHydrateCart } from '@/lib/cartStore';
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
const IS_SANDBOX = (process.env.NEXT_PUBLIC_PAYPAL_ENV ?? 'sandbox') !== 'live';

export default function CheckoutPage() {
  useHydrateCart();
  const items = useCart((s) => s.items);
  const hasHydrated = useCart((s) => s.hasHydrated);
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

  if (!hasHydrated) {
    return (
      <main className="kk-container py-16">
        <div className="rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-8">
          <p className="text-sm font-black uppercase text-[#ff4f5f]">Checkout</p>
          <h1 className="mt-2 text-3xl font-black">Loading your cart</h1>
          <p className="mt-2 text-[#f7f1df]/64">Checking your saved items before checkout.</p>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="kk-container py-16">
        <div className="rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-8">
          <p className="text-sm font-black uppercase text-[#ff4f5f]">Checkout</p>
          <h1 className="mt-2 text-3xl font-black">Your cart is empty</h1>
          <p className="mt-2 text-[#f7f1df]/64">Add something you like and come back to checkout.</p>
          <Link
            href="/products"
            className="kk-focus mt-6 inline-flex h-11 items-center rounded-md bg-[#f7f1df] px-4 text-sm font-black text-black hover:bg-[#d6ff57]"
          >
            Browse products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="kk-container py-10">
      <div className="mb-8">
        <p className="text-sm font-black uppercase text-[#ff4f5f]">Secure checkout</p>
        <h1 className="mt-2 text-4xl font-black text-[#f7f1df]">Complete your order</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#f7f1df]/62">
          Add your shipping details, review your items, then choose PayPal or card.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-5">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#f7f1df]/10 pb-4">
            <div>
              <h2 className="text-lg font-black">Shipping details</h2>
              <p className="mt-1 text-sm text-[#f7f1df]/54">Used for PayPal and Printify fulfillment.</p>
            </div>
            <span
              className={`rounded-md px-2.5 py-1 text-xs font-black ${
                formValues ? 'bg-[#d6ff57] text-black' : 'bg-[#ff4f5f]/14 text-[#ff4f5f]'
              }`}
            >
              {formValues ? 'Ready' : 'Required'}
            </span>
          </div>
          <CheckoutForm onValidChange={setFormValues} />
        </section>

        <aside className="self-start rounded-lg border border-[#f7f1df]/12 bg-[#11110d] p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-black">Order summary</h2>
          <ul className="mt-4 divide-y divide-[#f7f1df]/10">
            {items.map((i) => (
              <li key={`${i.sku}-${i.color ?? ''}-${i.size ?? ''}`} className="flex gap-3 py-4 first:pt-0">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-[#0b0b09]">
                  {i.image ? <Image src={i.image} alt={i.title} fill className="object-cover" sizes="80px" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-black">{i.title}</p>
                  <p className="mt-1 text-xs text-[#f7f1df]/54">
                    {[i.color ? `Color: ${i.color}` : '', i.size ? `Size: ${i.size}` : '', `SKU: ${i.sku}`]
                      .filter(Boolean)
                      .join(' / ')}
                  </p>
                  <p className="mt-2 text-xs text-[#f7f1df]/54">
                    Qty {i.qty} at {formatPrice(i.price)}
                  </p>
                </div>
                <div className="text-sm font-black text-[#35d7f2]">
                  {formatPrice(i.price * i.qty)}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-3 space-y-3 border-t border-[#f7f1df]/10 pt-4 text-sm">
            <div className="flex justify-between text-[#f7f1df]/62">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#f7f1df]/62">
              <span>Shipping</span>
              <span>{formatPrice(shipping)}</span>
            </div>
            <div className="flex justify-between border-t border-[#f7f1df]/10 pt-3 text-base font-black text-[#f7f1df]">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          <div
            className={`mt-6 space-y-2 transition-opacity ${
              formValues ? 'opacity-100' : 'pointer-events-none opacity-40'
            }`}
          >
            <div ref={paypalRef} style={{ colorScheme: 'light' }} />
            <div ref={cardRef} style={{ colorScheme: 'light' }} />
          </div>
          {IS_SANDBOX ? <p className="mt-3 text-xs text-[#f7f1df]/42">PayPal sandbox active.</p> : null}
          {!formValues && (
            <p className="mt-2 text-xs font-semibold text-[#ff4f5f]">
              Complete shipping details to enable payment.
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
