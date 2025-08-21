"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/privacy", label: "About" }, // point to /privacy for now
  { href: "mailto:orders@kamikulture.com", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
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
  );
}
