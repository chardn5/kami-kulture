'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart, useHydrateCart } from '@/lib/cartStore';
import { formatPrice } from '@/lib/format';

type Props = { open: boolean; onClose: () => void };

export default function CartDrawer({ open, onClose }: Props) {
  useHydrateCart();
  const items = useCart(s => s.items);
  const hasHydrated = useCart(s => s.hasHydrated);
  const setQty = useCart(s => s.setQty);
  const remove = useCart(s => s.remove);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      onClick={handleBackdrop}
    >
      <div className={`absolute inset-0 bg-black/70 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />

      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-[#f7f1df]/12 bg-[#11110d] text-[#f7f1df] shadow-2xl transition-transform
        ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between border-b border-[#f7f1df]/10 p-4">
          <div>
            <h2 className="text-lg font-black">Your Cart</h2>
            <p className="text-xs text-[#f7f1df]/54">
              {hasHydrated
                ? `${items.length} item${items.length === 1 ? '' : 's'} ready for checkout`
                : 'Cart loading'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="kk-focus inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#f7f1df]/16 hover:bg-[#f7f1df]/8"
            aria-label="Close cart"
          >
            X
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {!hasHydrated ? (
            <div className="p-6">
              <p className="text-sm text-[#f7f1df]/64">Loading your cart...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-[#f7f1df]/64">Your cart is empty.</p>
              <Link
                href="/products"
                onClick={onClose}
                className="kk-focus mt-5 inline-flex h-11 items-center rounded-md bg-[#f7f1df] px-4 text-sm font-black text-black"
              >
                Shop products
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#f7f1df]/10">
              {items.map((i) => (
                <div key={`${i.sku}-${i.color ?? ''}-${i.size ?? ''}`} className="flex gap-4 p-4">
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-[#0b0b09]">
                    {i.image ? (
                      <Image src={i.image} alt={i.title} fill className="object-cover" sizes="96px" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-black">{i.title}</p>
                        {(i.color || i.size) && (
                          <p className="mt-1 text-xs text-[#f7f1df]/58">
                            {[i.color ? `Color: ${i.color}` : '', i.size ? `Size: ${i.size}` : '']
                              .filter(Boolean)
                              .join(' / ')}
                          </p>
                        )}
                        <p className="mt-1 truncate text-xs text-[#f7f1df]/42">{i.sku}</p>
                      </div>
                      <button
                        onClick={() => remove(i.sku, i.size, i.color)}
                        className="kk-focus rounded-md text-xs font-semibold text-[#f7f1df]/54 hover:text-[#ff4f5f]"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label htmlFor={`qty-${i.sku}-${i.color ?? 'na'}-${i.size ?? 'na'}`} className="text-xs text-[#f7f1df]/54">
                          Qty
                        </label>
                        <input
                          id={`qty-${i.sku}-${i.color ?? 'na'}-${i.size ?? 'na'}`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          className="h-9 w-16 rounded-md border border-[#f7f1df]/14 bg-[#171711] px-2 text-sm text-[#f7f1df]"
                          value={i.qty}
                          onChange={(e) => {
                            const v = Math.max(1, Number(e.target.value) || 1);
                            setQty(i.sku, i.size, i.color, v);
                          }}
                        />
                      </div>
                      <p className="text-sm font-black text-[#35d7f2]">{formatPrice(i.price * i.qty)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[#f7f1df]/10 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#f7f1df]/58">Subtotal</p>
            <p className="text-xl font-black">{formatPrice(subtotal)}</p>
          </div>
          <p className="mt-1 text-xs text-[#f7f1df]/46">Shipping and tax are calculated at checkout.</p>

          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <Link
              href="/checkout"
              onClick={onClose}
              className={`kk-focus inline-flex h-12 items-center justify-center rounded-md bg-[#f7f1df] px-4 text-center text-sm font-black text-black hover:bg-[#d6ff57] ${items.length === 0 ? 'pointer-events-none opacity-50' : ''}`}
            >
              Checkout
            </Link>
            <button
              onClick={onClose}
              className="kk-focus inline-flex h-12 items-center justify-center rounded-md border border-[#f7f1df]/16 px-4 text-sm font-semibold hover:bg-[#f7f1df]/8"
            >
              Continue
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
