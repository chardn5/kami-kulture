"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/products", label: "Products" },
  { href: "/privacy", label: "About" }, // temp About target
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          <span className="text-white">Kami </span>
          <span className="text-sky-400">Kulture</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {links.map(l => {
            const active = pathname === l.href || pathname?.startsWith(l.href);
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
      </div>
    </header>
  );
}
