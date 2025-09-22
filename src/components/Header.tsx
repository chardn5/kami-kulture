// /src/components/Header.tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import CartDrawer from './CartDrawer';
import { useCart } from '@/lib/cartStore';

export default function Header() {
  const items = useCart((s) => s.items);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const count = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur supports-[backdrop-filter]:bg-black/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 text-white">
          {/* Left: brand + desktop nav */}
          <div className="flex items-center gap-2 sm:gap-6">
            <Link
              href="/"
              className="text-lg sm:text-xl font-extrabold tracking-wide whitespace-nowrap hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-sky-400/60 rounded"
              aria-label="Kami Kulture Home"
            >
              <span className="text-white">KAMI </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-blue-500">
                KULTURE
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-5 text-sm text-neutral-300">
              <Link href="/products" className="hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-400/60 rounded">
                Shop
              </Link>
              <Link href="/about" className="hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-400/60 rounded">
                About
              </Link>
              <Link href="/contact" className="hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-400/60 rounded">
                Contact
              </Link>
            </nav>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2">
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-white/80 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                {menuOpen ? (
                  <path fill="currentColor" d="M18.3 5.71L12 12.01l-6.3-6.3-1.4 1.41L10.6 13.4l-6.3 6.3 1.4 1.41L12 14.83l6.3 6.29 1.4-1.41-6.3-6.3 6.3-6.29-1.4-1.41z"/>
                ) : (
                  <path fill="currentColor" d="M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z"/>
                )}
              </svg>
            </button>

            {/* Cart button */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative rounded-xl bg-neutral-900/80 px-3 py-2 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
              aria-label="Open cart"
            >
              {/* bag icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M7 7V6a5 5 0 0 1 10 0v1h2a1 1 0 0 1 .99 1.141l-1.6 11A2 2 0 0 1 16.41 21H7.59a2 2 0 0 1-1.98-1.859l-1.6-11A1 1 0 0 1 5 7zm2 0h6V6a3 3 0 0 0-6 0z"/>
              </svg>
              {count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 min-w-[18px] h-[18px] rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold leading-[18px] text-black text-center">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile nav panel */}
        {menuOpen && (
          <nav className="md:hidden border-t border-white/10 bg-black/80">
            <div className="mx-auto max-w-6xl px-4 py-3">
              <div className="flex flex-col gap-3 text-sm">
                <Link href="/products" className="text-neutral-200 hover:text-white" onClick={() => setMenuOpen(false)}>
                  Shop
                </Link>
                <Link href="/about" className="text-neutral-200 hover:text-white" onClick={() => setMenuOpen(false)}>
                  About
                </Link>
                <Link href="/contact" className="text-neutral-200 hover:text-white" onClick={() => setMenuOpen(false)}>
                  Contact
                </Link>
              </div>
            </div>
          </nav>
        )}
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
