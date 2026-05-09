"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useCart } from "@/lib/cartStore";
import CartDrawer from "@/components/CartDrawer";

const links = [
  { href: "/products", label: "Shop" },
  { href: "/shipping-returns", label: "Shipping" },
  { href: "/track-order", label: "Track Order" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);       // mobile menu
  const [cartOpen, setCartOpen] = useState(false); // cart drawer

  const items = useCart((s) => s.items);
  const count = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#f7f1df]/10 bg-[#0f0f0c]/88 backdrop-blur-xl">
        <div className="kk-container flex h-16 items-center justify-between">
          {/* Brand */}
          <Link href="/" className="kk-focus flex items-center gap-3 rounded-md">
            <Image src="/logo.png" alt="" width={38} height={38} className="rounded-md" priority />
            <span className="flex flex-col leading-none">
              <span className="text-sm font-black uppercase text-[#f7f1df]">Kami Kulture</span>
              <span className="mt-1 text-[11px] font-medium text-[#35d7f2]">Anime-inspired apparel</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 text-sm md:flex">
            {links.map((l) => {
              const active = l.href !== "/" ? pathname?.startsWith(l.href) : pathname === "/";
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`kk-focus rounded-md px-3 py-2 transition ${
                    active
                      ? "bg-[#f7f1df] text-black"
                      : "text-[#f7f1df]/78 hover:bg-[#f7f1df]/8 hover:text-[#f7f1df]"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Cart button (desktop & mobile) */}
            <button
              onClick={() => setCartOpen(true)}
              className="kk-focus relative inline-flex h-10 items-center gap-2 rounded-md border border-[#f7f1df]/18 bg-[#f7f1df]/6 px-3 text-sm font-semibold text-[#f7f1df] transition hover:bg-[#f7f1df]/12"
              aria-label="Open cart"
            >
              {/* bag icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M7 7V6a5 5 0 0 1 10 0v1h2a1 1 0 0 1 .99 1.141l-1.6 11A2 2 0 0 1 16.41 21H7.59a2 2 0 0 1-1.98-1.859l-1.6-11A1 1 0 0 1 5 7zm2 0h6V6a3 3 0 0 0-6 0z"
                />
              </svg>
              <span className="hidden sm:inline">Cart</span>
              {count > 0 && (
                <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[#d6ff57] px-1.5 text-[10px] font-black leading-5 text-black">
                  {count}
                </span>
              )}
            </button>

            {/* Mobile toggle */}
            <button
              className="kk-focus inline-flex h-10 items-center gap-2 rounded-md border border-[#f7f1df]/18 px-3 text-sm font-semibold md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              Menu
              <span className="text-[#f7f1df]/70">{open ? "Close" : "Open"}</span>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <nav id="mobile-menu" className="border-t border-[#f7f1df]/10 bg-[#0f0f0c] md:hidden">
            <div className="kk-container flex flex-col gap-2 py-3 text-sm">
              {links.map((l) => {
                const active = l.href !== "/" ? pathname?.startsWith(l.href) : pathname === "/";
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={`kk-focus rounded-md px-3 py-2 ${
                      active ? "bg-[#f7f1df] text-black" : "text-[#f7f1df]/82"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      {/* Slide-over cart */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
