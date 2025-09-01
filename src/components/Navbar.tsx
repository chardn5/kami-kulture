"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useCart } from "@/lib/cartStore";
import CartDrawer from "@/components/CartDrawer";

const links = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/privacy", label: "About" }, // point to /privacy for now
  { href: "mailto:orders@kamikulture.com", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);       // mobile menu
  const [cartOpen, setCartOpen] = useState(false); // cart drawer

  const items = useCart((s) => s.items);
  const count = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Kami Kulture" width={36} height={36} className="rounded" />
            <span className="sr-only">Kami Kulture</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {links.map((l) => {
              const active = l.href !== "/" ? pathname?.startsWith(l.href) : pathname === "/";
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`hover:opacity-90 ${active ? "underline underline-offset-4" : "opacity-90"}`}
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
              className="relative inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/5"
              aria-label="Open cart"
            >
              {/* bag icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="opacity-90">
                <path
                  fill="currentColor"
                  d="M7 7V6a5 5 0 0 1 10 0v1h2a1 1 0 0 1 .99 1.141l-1.6 11A2 2 0 0 1 16.41 21H7.59a2 2 0 0 1-1.98-1.859l-1.6-11A1 1 0 0 1 5 7zm2 0h6V6a3 3 0 0 0-6 0z"
                />
              </svg>
              <span className="hidden sm:inline">Cart</span>
              {count > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold leading-5 text-black">
                  {count}
                </span>
              )}
            </button>

            {/* Mobile toggle */}
            <button
              className="md:hidden inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-1.5 text-sm"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              Menu
              <span className="text-white/70">{open ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <nav id="mobile-menu" className="md:hidden border-t border-white/10 bg-[#0B0F19]">
            <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-3 text-sm">
              {links.map((l) => {
                const active = l.href !== "/" ? pathname?.startsWith(l.href) : pathname === "/";
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={`py-1 ${active ? "underline underline-offset-4" : "opacity-90"}`}
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
