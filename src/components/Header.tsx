'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import CartDrawer from './CartDrawer';
import { useCart } from '@/lib/cartStore';

export default function Header() {
  const items = useCart(s => s.items);
  const [open, setOpen] = useState(false);

  const count = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-neutral-900 bg-black/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 text-white">
          {/* Left: brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold tracking-wide">KAMI KULTURE</Link>
            <nav className="hidden gap-4 text-sm text-neutral-300 md:flex">
              <Link href="/shop" className="hover:text-white">Shop</Link>
              <Link href="/about" className="hover:text-white">About</Link>
              <Link href="/contact" className="hover:text-white">Contact</Link>
            </nav>
          </div>

          {/* Right: cart button */}
          <button
            onClick={() => setOpen(true)}
            className="relative rounded-xl bg-neutral-900 px-3 py-2 hover:bg-neutral-800"
            aria-label="Open cart"
          >
            {/* simple bag icon (inline svg, no deps) */}
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M7 7V6a5 5 0 0 1 10 0v1h2a1 1 0 0 1 .99 1.141l-1.6 11A2 2 0 0 1 16.41 21H7.59a2 2 0 0 1-1.98-1.859l-1.6-11A1 1 0 0 1 5 7zm2 0h6V6a3 3 0 0 0-6 0z"/>
            </svg>
            {count > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold leading-5 text-black">
                {count}
              </span>
            )}
          </button>
        </div>
      </header>

      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
