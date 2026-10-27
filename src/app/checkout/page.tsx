"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, AlertCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { useCart, useHydrateCart } from "@/lib/cartStore";
import { formatPrice } from "@/lib/format";
import { loadPayPalSDK } from "@/lib/paypalClient";
import CheckoutForm, {
  type NormalizedCheckout,
} from "@/components/CheckoutForm";

type Quote = {
  token: string;
  expiresAt: number;
  pricing: { subtotal: number; shipping: number; tax: number; total: number };
  personalOffer?: { retailSubtotal: number; discount: number };
  items: Array<{
    sku: string;
    title: string;
    qty: number;
    price: number;
    color?: string;
    size?: string;
    image?: string;
  }>;
};
type Buttons = {
  render: (el: HTMLElement) => Promise<void> | void;
  close?: () => void;
  isEligible?: () => boolean;
};
const IS_SANDBOX = !["live", "production"].includes(
  process.env.NEXT_PUBLIC_PAYPAL_ENV ?? "sandbox",
);

export default function CheckoutPage() {
  useHydrateCart();
  const items = useCart((s) => s.items);
  const hasItems = items.length > 0;
  const hydrated = useCart((s) => s.hasHydrated);
  const clear = useCart((s) => s.clear);
  const [customer, setCustomer] = useState<NormalizedCheckout | null>(null);
  const [quoteState, setQuote] = useState<{ key: string; quote: Quote } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [sdkReady, setSdkReady] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const walletRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const key = JSON.stringify({
    cart: items.map((i) => ({ sku: i.sku, qty: i.qty })),
    customer,
    ...(discountCode ? { discountCode } : {}),
  });
  const quote = quoteState?.key === key ? quoteState.quote : null;
  const latest = useRef<Quote | null>(null);
  latest.current = quote;

  useEffect(() => {
    const body = JSON.parse(key);
    if (!body.customer || !body.cart.length) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: key,
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.error ||
              "Shipping could not be calculated. Please try again.",
          );
        if (!controller.signal.aborted) setQuote({ key, quote: result });
      } catch (err) {
        if (!controller.signal.aborted) {
          setQuote(null);
          setError(err instanceof Error ? err.message : "Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 800);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [key, retry]);

  useEffect(() => {
    if (!quote) return;
    const timeout = setTimeout(
      () => {
        setQuote(null);
        setError("Your shipping quote has expired. Refresh it to continue.");
      },
      Math.max(0, quote.expiresAt - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [quote]);

  useEffect(() => {
    if (!hydrated || !hasItems) return;
    let cancelled = false;
    const buttons: Buttons[] = [];
    async function render() {
      try {
        const paypal = await loadPayPalSDK();
        if (cancelled || !walletRef.current || !cardRef.current) return;
        const createOrder = async () => {
          setPaymentError("");
          const current = latest.current;
          if (!current || current.expiresAt <= Date.now())
            throw new Error("Please refresh your shipping quote.");
          setBusy(true);
          const response = await fetch("/api/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quoteToken: current.token }),
          });
          const result = await response.json();
          if (!response.ok || !result.id)
            throw new Error(result.error || "Payment could not be started.");
          setBusy(true);
          return result.id;
        };
        const onApprove = async (data: { orderID: string }) => {
          setBusy(true);
          try {
            const response = await fetch("/api/orders/capture", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paypalOrderId: data.orderID }),
            });
            const result = await response.json();
            if (!response.ok || !result.ok)
              throw new Error(
                result.error || "Payment could not be confirmed.",
              );
            const email = customerEmail.current;
            clear();
            window.location.assign(
              `/thank-you?${new URLSearchParams({ orderID: result.orderId, ...(email ? { email } : {}) })}`,
            );
          } catch (err) {
            setPaymentError(
              err instanceof Error
                ? err.message
                : "Please contact support before paying again.",
            );
            setBusy(false);
          }
        };
        const options = {
          createOrder,
          onApprove,
          onClick: (
            _: unknown,
            actions: { resolve: () => void; reject: () => void },
          ) =>
            latest.current && latest.current.expiresAt > Date.now()
              ? actions.resolve()
              : actions.reject(),
          onCancel: () => setBusy(false),
          onError: (err: unknown) => {
            setBusy(false);
            setPaymentError(
              err instanceof Error
                ? err.message
                : "PayPal could not complete checkout. Please try again.",
            );
          },
          style: { shape: "rect", layout: "vertical" },
        };
        const wallet = paypal.Buttons({
          ...options,
          fundingSource: paypal.FUNDING.PAYPAL,
        }) as Buttons;
        buttons.push(wallet);
        await wallet.render(walletRef.current);
        const card = paypal.Buttons({
          ...options,
          fundingSource: paypal.FUNDING.CARD,
        }) as Buttons;
        buttons.push(card);
        if (card.isEligible?.()) await card.render(cardRef.current);
        if (!cancelled) setSdkReady(true);
      } catch {
        if (!cancelled)
          setPaymentError(
            "Payment options could not load. Refresh this page or contact support.",
          );
      }
    }
    void render();
    return () => {
      cancelled = true;
      buttons.forEach((b) => {
        try {
          b.close?.();
        } catch {}
      });
    };
  }, [hydrated, hasItems, clear]);
  const customerEmail = useRef("");
  customerEmail.current = customer?.email ?? customerEmail.current;

  if (!hydrated || !items.length)
    return (
      <div className="kk-container py-20">
        <h1 className="text-3xl font-black">
          {hydrated ? "Your cart is empty" : "Loading your cart"}
        </h1>
        <p className="mt-3 text-[#f7f1df]/65">
          {hydrated ? "Find your next daily rotation." : "Just a moment."}
        </p>
        {hydrated && (
          <Link className="kk-button mt-6" href="/products">
            Shop the collection
          </Link>
        )}
      </div>
    );

  const summaryItems = quote?.items ?? items;
  const subtotal =
    quote?.pricing.subtotal ?? items.reduce((n, i) => n + i.qty * i.price, 0);
  return (
    <div className="kk-container py-8 md:py-12">
      <Link
        href="/products"
        className="kk-focus inline-flex items-center gap-2 text-sm text-[#f7f1df]/65"
      >
        <ArrowLeft size={16} /> Continue shopping
      </Link>
      <div className="mb-8 mt-6">
        <p className="kk-eyebrow">Checkout</p>
        <h1 className="mt-2 text-3xl font-black md:text-4xl">Make it yours.</h1>
        <p className="mt-3 text-sm text-[#f7f1df]/65">
          Your items, your address, one final total before you pay.
        </p>
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section>
          <h2 className="mb-5 border-b border-white/15 pb-4 text-lg font-bold">
            1. Delivery details
          </h2>
          <fieldset disabled={busy}>
            <CheckoutForm onValidChange={setCustomer} />
          </fieldset>
          <p className="mt-5 text-xs leading-5 text-[#f7f1df]/55">
            Your address is shared with our production partner to confirm
            delivery availability and fulfill your order.
          </p>
        </section>
        <aside className="self-start border-t border-white/15 pt-5 lg:sticky lg:top-24 lg:border-t-0 lg:pt-0">
          <h2 className="text-lg font-bold">2. Review & pay</h2>
          <ul className="mt-5 divide-y divide-white/10">
            {summaryItems.map((i) => (
              <li key={i.sku} className="flex gap-3 py-4">
                <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded bg-white/5">
                  {i.image && (
                    <Image
                      src={i.image}
                      unoptimized={i.image.startsWith('https://images-api.printify.com/')}
                      alt={i.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{i.title}</p>
                  <p className="mt-1 text-xs text-[#f7f1df]/60">
                    {i.color} / {i.size}
                  </p>
                  <p className="mt-3 text-xs text-[#f7f1df]/60">
                    Qty {i.qty} · {formatPrice(i.price)} each
                  </p>
                </div>
                <span className="text-sm font-bold">
                  {formatPrice(i.qty * i.price)}
                </span>
              </li>
            ))}
          </ul>
          <form className="mt-5 grid gap-2" onSubmit={event => { event.preventDefault(); setDiscountCode(discountInput.trim().toUpperCase()); setRetry(n => n + 1); }}>
            <label htmlFor="discount-code" className="text-xs font-bold uppercase text-[#f7f1df]/60">Discount code</label>
            <div className="flex gap-2">
              <input id="discount-code" value={discountInput} onChange={event => setDiscountInput(event.target.value)} maxLength={80} autoComplete="off" disabled={busy} className="h-11 min-w-0 flex-1 rounded border border-white/20 bg-transparent px-3 text-sm" />
              <button type="submit" disabled={busy || loading || !customer} className="kk-focus rounded border border-white/20 px-4 text-sm font-bold disabled:opacity-40">Apply</button>
              {discountCode && <button type="button" disabled={busy} onClick={() => { setDiscountCode(''); setDiscountInput(''); }} className="kk-focus px-2 text-xs underline">Remove</button>}
            </div>
          </form>
          <dl className="mt-4 space-y-3 border-t border-white/15 pt-5 text-sm">
            <div className="flex justify-between">
              <dt>Items</dt>
              <dd>{formatPrice(quote?.personalOffer?.retailSubtotal ?? subtotal)}</dd>
            </div>
            {quote?.personalOffer && <div className="flex justify-between gap-4 text-[#d6ff57]"><dt>Personal order · markup waived</dt><dd>-{formatPrice(quote.personalOffer.discount)}</dd></div>}
            <div className="flex justify-between gap-4">
              <dt>Standard shipping</dt>
              <dd>
                {quote
                  ? formatPrice(quote.pricing.shipping)
                  : customer && loading
                    ? "Calculating..."
                    : "Calculated for your address"}
              </dd>
            </div>
            <div className="flex justify-between border-t border-white/15 pt-4 text-lg font-bold">
              <dt>{quote ? "Total (USD)" : "Subtotal (USD)"}</dt>
              <dd>{formatPrice(quote?.pricing.total ?? subtotal)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-[#f7f1df]/55">
            Made to order in 3-7 business days before shipping. Carrier transit
            time varies by destination. Import charges may apply on arrival.
          </p>
          {error && (
            <div
              role="alert"
              className="mt-5 border-l-2 border-[#ff4f5f] pl-3 text-sm leading-6"
            >
              <p>{error}</p>
              <button
                onClick={() => {
                  setQuote(null);
                  setRetry((n) => n + 1);
                }}
                className="kk-focus mt-2 inline-flex items-center gap-2 text-[#35d7f2]"
              >
                <RefreshCw size={14} /> Refresh quote
              </button>
            </div>
          )}
          {!customer && (
            <p className="mt-5 text-sm text-[#f7f1df]/65">
              Complete your delivery details to confirm shipping and unlock
              payment.
            </p>
          )}
          <div
            className={`mt-6 space-y-2 ${!quote || busy ? "pointer-events-none opacity-40" : ""}`}
            inert={!quote || busy}
          >
            <div ref={walletRef} style={{ colorScheme: "light" }} />
            <div ref={cardRef} style={{ colorScheme: "light" }} />
          </div>
          {!sdkReady && !paymentError && (
            <p role="status" className="mt-2 text-xs text-[#f7f1df]/55">
              Loading payment options...
            </p>
          )}
          {busy && (
            <p role="status" className="mt-3 text-sm">
              Confirming your payment. Keep this page open.
            </p>
          )}
          {paymentError && (
            <p
              role="alert"
              className="mt-4 flex gap-2 text-sm leading-6 text-[#ff4f5f]"
            >
              <AlertCircle className="mt-1 shrink-0" size={16} />
              {paymentError}
            </p>
          )}
          <p className="mt-4 flex items-center gap-2 text-xs text-[#f7f1df]/60">
            <ShieldCheck size={15} />{" "}
            {IS_SANDBOX
              ? "PayPal sandbox · Test payments only"
              : "Secure payment through PayPal"}
          </p>
          <p className="mt-4 text-xs leading-5 text-[#f7f1df]/50">
            By placing an order you agree to our{" "}
            <Link className="underline" href="/terms">
              terms
            </Link>{" "}
            and{" "}
            <Link className="underline" href="/shipping-returns">
              returns policy
            </Link>
            . Read our{" "}
            <Link className="underline" href="/privacy">
              privacy policy
            </Link>
            .
          </p>
          <Link
            href="/contact"
            className="kk-focus mt-4 inline-block text-xs text-[#35d7f2]"
          >
            Need help with checkout?
          </Link>
        </aside>
      </div>
    </div>
  );
}
