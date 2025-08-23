'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginInner() {
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') ?? '/dev/orders';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await fetch('/api/dev/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) router.push(next);
      else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(data?.error ?? 'Invalid password');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-white">
      <div className="rounded-2xl bg-neutral-900/70 p-8 ring-1 ring-white/10">
        <h1 className="text-xl font-semibold">Admin sign-in</h1>
        <p className="mt-1 text-sm text-neutral-400">Access to developer tools requires a password.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-neutral-300">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400"
              required
            />
          </label>

          {err ? <p className="text-sm text-red-400">{err}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-500 px-4 py-2 font-medium text-black disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginClient() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-md px-4 py-16 text-center text-white">Loading…</main>}>
      <LoginInner />
    </Suspense>
  );
}
