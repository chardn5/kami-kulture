'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/lib/cartStore';
import { formatPrice } from '@/lib/format';

type Props = { open: boolean; onClose: () => void };

export default function CartDrawer({ open, onClose }: Props) {
  const items = useCart(s => s.items);
  const setQty = useCart(s => s.setQty);
  const remove = useCart(s => s.remove);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  useEffect(() => {
    // prevent background scroll when open
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
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/60 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />

      {/* Panel */}
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-neutral-950 text-white shadow-xl transition-transform
        ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="text-lg font-semibold">Your Cart</h2>
          <button onClick={onClose} className="rounded-lg px-3 py-1 bg-neutral-800 hover:bg-neutral-700">Close</button>
        </div>

        {/* Items */}
        <div className="max-h-[60vh] overflow-auto divide-y divide-neutral-900">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-neutral-400">Your cart is empty.</p>
          ) : (
            items.map((i) => (
              <div key={`${i.sku}-${i.size ?? ''}`} className="flex gap-3 p-4">
                <div className="relative h-20 w-20 overflow-hidden rounded bg-neutral-900">
                  {i.image ? (
                    <Image src={i.image} alt={i.title} fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{i.title}</p>
                      {i.size && <p className="text-xs text-neutral-400 mt-0.5">Size: {i.size}</p>}
                      <p className="text-xs text-neutral-500 mt-0.5">{i.sku}</p>
                    </div>
                    <button
                      onClick={() => remove(i.sku, i.size)}
                      className="text-xs text-neutral-400 hover:text-red-400"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label htmlFor={`qty-${i.sku}-${i.size ?? 'na'}`} className="text-xs text-neutral-400">Qty</label>
                      <input
                        id={`qty-${i.sku}-${i.size ?? 'na'}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        className="w-16 rounded bg-neutral-800 px-2 py-1 text-sm"
                        value={i.qty}
                        onChange={(e) => {
                          const v = Math.max(1, Number(e.target.value) || 1);
                          setQty(i.sku, i.size, v);
                        }}
                      />
                    </div>
                    <p className="text-sm">{formatPrice(i.price * i.qty)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-neutral-800 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-400">Subtotal</p>
            <p className="text-base font-semibold">{formatPrice(subtotal)}</p>
          </div>
          <p className="mt-1 text-xs text-neutral-500">Shipping & taxes calculated at checkout.</p>

          <div className="mt-4 flex gap-2">
            <Link
              href="/checkout"
              onClick={onClose}
              className={`flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-center font-medium text-black hover:opacity-90 ${items.length === 0 ? 'pointer-events-none opacity-50' : ''}`}
            >
              Checkout
            </Link>
            <button onClick={onClose} className="rounded-xl bg-neutral-800 px-4 py-2 hover:bg-neutral-700">Continue</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
