import type { Metadata } from 'next';
import Image from 'next/image';
import { safeAdminNext } from '@/lib/adminLogin';

export const metadata: Metadata = { title: 'Admin sign in', robots: { index: false, follow: false } };

export default async function AdminSignIn({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeAdminNext(typeof sp.next === 'string' ? sp.next : null);
  return <section className="mx-auto flex min-h-[75vh] w-full max-w-md flex-col justify-center px-5 py-12">
    <Image src="/logo.png" alt="Kami Kulture" width={56} height={56} className="mb-6 rounded-md" />
    <p className="text-xs font-bold uppercase text-[#35d7f2]">Kami Kulture</p>
    <h1 className="mt-2 text-3xl font-black">Admin sign in</h1>
    <form action="/api/admin/session" method="post" className="mt-8 space-y-5">
      <input type="hidden" name="next" value={next} />
      <div><label htmlFor="username" className="mb-2 block text-sm font-semibold">Username</label>
        <input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={200} className="h-12 w-full rounded-md border border-white/20 bg-black/25 px-3" /></div>
      <div><label htmlFor="password" className="mb-2 block text-sm font-semibold">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={500} className="h-12 w-full rounded-md border border-white/20 bg-black/25 px-3" /></div>
      {sp.error ? <p role="alert" className="text-sm text-[#ff7885]">{sp.error === 'limit' ? 'Too many attempts. Please wait a few minutes.' : 'Unable to sign in. Check your username and password.'}</p> : null}
      <button type="submit" className="kk-focus h-12 w-full rounded-md bg-[#d6ff57] font-bold text-black">Sign in</button>
    </form>
  </section>;
}
