'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Palette, CreditCard, LogOut, ExternalLink } from 'lucide-react';

const links = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: Package },
  { href: '/admin/designs', label: 'Products', icon: Palette },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
];
export default function AdminNavigation() {
  const pathname = usePathname();
  return <header className="border-b border-white/15 bg-[#141615]">
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin" className="font-black">KAMI KULTURE <span className="ml-2 text-xs font-medium text-[#35d7f2]">ADMIN</span></Link>
        <div className="flex gap-4 text-sm"><Link href="/" className="kk-focus flex items-center gap-2"><ExternalLink size={16} />Store</Link>
          <form action="/admin/sign-out" method="post"><button className="kk-focus flex items-center gap-2"><LogOut size={16} />Sign out</button></form></div>
      </div>
      <nav aria-label="Admin" className="mt-4 flex flex-wrap gap-1">{links.map(({ href, label, icon: Icon }) => {
        const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
        return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`kk-focus flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold ${active ? 'bg-[#d6ff57] text-black' : 'text-white/70 hover:bg-white/10'}`}><Icon size={17} />{label}</Link>;
      })}</nav>
    </div>
  </header>;
}
