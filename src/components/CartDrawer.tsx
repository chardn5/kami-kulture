"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart, useHydrateCart } from "@/lib/cartStore";
import { formatPrice } from "@/lib/format";

export default function CartDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useHydrateCart();
  const items = useCart((s) => s.items);
  const hydrated = useCart((s) => s.hasHydrated);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const dialog = useRef<HTMLDialogElement>(null);
  const count = items.reduce((n, i) => n + i.qty, 0);
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    dialog.current?.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="cart-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const box = e.currentTarget.getBoundingClientRect();
          if (e.clientX < box.left || e.clientX > box.right) onClose();
        }
      }}
      className="kk-dialog m-0 ml-auto h-dvh max-h-none w-full max-w-md border-l border-white/15 bg-[#11110d] p-0 text-[#f7f1df]"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-white/15 p-5">
          <div>
            <h2 id="cart-title" className="text-xl font-black">
              Your cart
            </h2>
            <p className="mt-1 text-xs text-[#f7f1df]/55">
              {hydrated
                ? `${count} item${count === 1 ? "" : "s"}`
                : "Loading..."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="kk-icon"
            title="Close cart"
            aria-label="Close cart"
          >
            <X size={20} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">
          {!items.length ? (
            <div className="px-6 py-16 text-center">
              <ShoppingBag size={32} className="mx-auto text-[#35d7f2]" />
              <h3 className="mt-5 text-lg font-bold">
                Room for a new favorite.
              </h3>
              <p className="mt-2 text-sm text-[#f7f1df]/60">
                Your next daily tee is waiting.
              </p>
              <Link
                href="/products"
                className="kk-button mt-6"
                onClick={onClose}
              >
                Find your design
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-white/10">
              {items.map((i) => (
                <li key={i.sku} className="flex gap-4 p-5">
                  <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded bg-white/5">
                    {i.image && (
                      <Image
                        src={i.image}
                        alt={i.title}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold leading-5">{i.title}</p>
                      <button
                        type="button"
                        className="kk-focus p-1 text-[#f7f1df]/55 hover:text-[#ff4f5f]"
                        title="Remove item"
                        aria-label={`Remove ${i.title}`}
                        onClick={() => remove(i.sku, i.size, i.color)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-[#f7f1df]/60">
                      {i.color} / {i.size}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-xs text-[#f7f1df]/60">
                        Qty
                        <input
                          aria-label={`Quantity for ${i.title}`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={20}
                          value={i.qty}
                          className="h-9 w-16 rounded-md border border-white/15 bg-white/5 px-2 text-sm"
                          onChange={(e) =>
                            setQty(
                              i.sku,
                              i.size,
                              i.color,
                              Number(e.target.value),
                            )
                          }
                        />
                      </label>
                      <span className="text-sm font-bold">
                        {formatPrice(i.price * i.qty)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {!!items.length && (
          <footer className="border-t border-white/15 p-5">
            <div className="flex justify-between text-lg font-bold">
              <p>Subtotal (USD)</p>
              <p>{formatPrice(subtotal)}</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#f7f1df]/55">
              Delivery options and shipping cost are confirmed for your address
              at checkout.
            </p>
            <Link
              href="/checkout"
              onClick={onClose}
              className="kk-button mt-5 w-full gap-2"
            >
              Checkout <ArrowRight size={16} />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="kk-focus mt-3 w-full py-2 text-sm text-[#f7f1df]/70"
            >
              Continue shopping
            </button>
          </footer>
        )}
      </div>
    </dialog>
  );
}
