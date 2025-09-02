'use client';

import { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/lib/cartStore';
import { formatPrice } from '@/lib/format';

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

type PayPalButtonsInstance = { render: (container: HTMLElement) => void; close?: () => void };
type PayPalSDK = {
  Buttons: (opts: {
    style?: Record<string, unknown>;
    createOrder: (data: unknown, actions: { order: PayPalOrderActions }) => Promise<string> | string;
    onApprove: (data: { orderID: string }, actions: { order: PayPalOrderActions }) => Promise<void> | void;
    onError?: (err: unknown) => void;
  }) => PayPalButtonsInstance;
};
type WindowWithPaypal = Window & { paypal?: PayPalSDK };
/* -------------------------------- */

const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY ?? 'USD').toUpperCase();

async function loadPayPalSDK(): Promise<PayPalSDK> {
  const w = window as WindowWithPaypal;
  if (w.paypal) return w.paypal;
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  if (!clientId) throw new Error('NEXT_PUBLIC_PAYPAL_CLIENT_ID not set');

  const src =
    `https://www.paypal.com/sdk/js?components=buttons&client-id=${encodeURIComponent(clientId)}` +
    `&currency=${encodeURIComponent(CURRENCY)}&intent=capture`;

  const existing = Array.from(document.getElementsByTagName('script')).find((s) => s.src === src);
  if (existing) {
    await new Promise<void>((res) => {
      if (w.paypal) res();
      else existing.addEventListener('load', () => res(), { once: true });
    });
    if (!w.paypal) throw new Error('PayPal SDK not ready');
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

export default function CheckoutPage() {
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const containerRef = useRef<HTMLDivElement>(null);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.price * i.qty, 0), [items]);
  const shipping = 0;
  const tax = 0;
  const total = subtotal + shipping + tax;

  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    let buttons: PayPalButtonsInstance | null = null;

    const renderButtons = async () => {
      const container = containerRef.current;
      if (!container) return;

      const paypal = await loadPayPalSDK();
      if (cancelled) return;

      container.innerHTML = '';

      buttons = paypal.Buttons({
        style: { shape: 'pill', label: 'paypal', layout: 'horizontal' },

        createOrder: (_data, actions) =>
          actions.order.create({
            intent: 'CAPTURE',
            purchase_units: [
              {
                description: `Kami Kulture order (${items.length} item${items.length > 1 ? 's' : ''})`,
                amount: { currency_code: CURRENCY, value: total.toFixed(2) },
              },
            ],
          }),

        onApprove: async (data, actions) => {
          const details = await actions.order.capture();
          const orderID = data.orderID || details.id || '';

          const pu0 = details.purchase_units?.[0];
          const cap0 = pu0?.payments?.captures?.[0];
          const amtObj: PPAmount | undefined = cap0?.amount ?? pu0?.amount;
          // Removed unused 'value' variable to satisfy eslint
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
        },

        onError: (err) => {
          console.error('PayPal onError', err);
          alert('PayPal error. Please try again.');
        },
      });

      buttons.render(container);
    };

    renderButtons();

    return () => {
      cancelled = true;
      try {
        buttons?.close?.();
      } catch {
        /* noop */
      }
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
      <div className="mt-6">
        <div ref={containerRef} />
        <p className="mt-2 text-xs text-neutral-500">PayPal Sandbox active.</p>
      </div>
    </main>
  );
}
