'use client';
import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/30 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-brand text-xl text-white tracking-wide">
          Kami <span className="text-sky-400">Kulture</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/products" className="text-slate-300 hover:text-white">Products</Link>
          <Link href="/designs" className="text-slate-300 hover:text-white">Designs</Link>
          <Link href="/about" className="text-slate-300 hover:text-white">About</Link>
        </div>
      </nav>
    </header>
  );
}
