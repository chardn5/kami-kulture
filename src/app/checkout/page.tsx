// src/app/checkout/page.tsx
'use client';

import { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/lib/cartStore';
import { formatPrice } from '@/lib/format';
import { loadPayPalSDK } from '@/lib/paypalClient';

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
  capture: () => Promise<PPOrder>;
};

type PayPalButtonsInstance = {
  render: (container: HTMLElement) => void;
  /** Optional on some SDK builds */
  isEligible?: () => boolean;
  close?: () => void;
};
/* -------------------------------- */

const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY ?? 'USD').toUpperCase();

export default function CheckoutPage() {
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const paypalRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

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

      const createOrder = (_data: unknown, actions: { order: PayPalOrderActions }) =>
        actions.order.create({
          intent: 'CAPTURE',
          purchase_units: [
            {
              description: `Kami Kulture order (${items.length} item${items.length > 1 ? 's' : ''})`,
              amount: { currency_code: CURRENCY, value: total.toFixed(2) },
            },
          ],
        });

      const onApprove = async (data: { orderID: string }, actions: { order: PayPalOrderActions }) => {
        const details = await actions.order.capture();
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
            paypalRaw: details,
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

      // Wallet button (wallet-only to avoid duplicate Card)
      walletButtons = paypal.Buttons({
        fundingSource: paypal.FUNDING.PAYPAL,
        style: { shape: 'pill', label: 'paypal', layout: 'vertical' },
        createOrder,
        onApprove,
        onError,
      }) as PayPalButtonsInstance;
      walletButtons.render(walletContainer);

      // Card button (render only if eligible)
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
  }, [items, subtotal, total, clear]);

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
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Checkout</h1>

      {/* Cart items */}
      <ul className="mt-6 divide-y divide-white/10 rounded-lg border border-white/10">
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
        <div className="flex justify-between text-white font-semibold pt-1 border-t border-white/10">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      {/* PayPal */}
      <div className="mt-6 space-y-2">
        <div ref={paypalRef} />
        <div ref={cardRef} />
        <p className="mt-2 text-xs text-neutral-500">PayPal Sandbox active.</p>
      </div>
    </main>
  );
}
