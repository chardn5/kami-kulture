// src/app/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";

const LAUNCH_UTC = "2025-09-15T04:00:00Z";

function useCountdown(targetIso: string) {
  const target = useMemo(() => new Date(targetIso).getTime(), [targetIso]);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now === null) return { d: 0, h: 0, m: 0, s: 0 };

  const diff = Math.max(0, target - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff / 3600000) % 24);
  const m = Math.floor((diff / 60000) % 60);
  const s = Math.floor((diff / 1000) % 60);
  return { d, h, m, s };
}

export default function Home() {
  const { d, h, m, s } = useCountdown(LAUNCH_UTC);

  return (
    <main className="min-h-screen bg-black text-white bg-grid relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-28 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl float" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl float" />

      <section className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-6xl sm:text-7xl tracking-tight">
          Kami <span className="text-sky-400">Kulture</span>
        </h1>
        <p className="mt-3 text-lg text-white/70">Anime‑inspired memes & quotes. New drops soon.</p>

        <div className="mt-8 grid grid-cols-4 gap-3">
          {[
            ["Days", d],
            ["Hours", h],
            ["Minutes", m],
            ["Seconds", s],
          ].map(([label, val]) => (
            <div key={label as string} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-3xl font-extrabold" suppressHydrationWarning>
                {String(val as number).padStart(2, "0")}
              </div>
              <div className="mt-1 text-xs tracking-wide text-white/60">{label}</div>
            </div>
          ))}
        </div>

        <form
          action="https://formspree.io/f/xjkojqjz"
          method="POST"
          className="mt-8 flex w-full max-w-xl flex-col items-center gap-3 sm:flex-row"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="your@email.com"
            className="w-full flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/50 outline-none focus:border-sky-400"
          />
          <button type="submit" className="w-full sm:w-auto rounded-xl bg-sky-500 px-6 py-3 font-semibold hover:bg-sky-400">
            Notify me
          </button>
        </form>

        <p className="mt-2 text-xs text-white/50">No spam. Unsubscribe anytime.</p>

        <div className="mt-8 flex gap-6 text-white/70">
          <a className="hover:text-white" href="#" aria-label="Instagram">Instagram</a>
          <a className="hover:text-white" href="#" aria-label="TikTok">TikTok</a>
          <a className="hover:text-white" href="#" aria-label="X">X / Twitter</a>
        </div>

        <p className="mt-16 text-xs text-white/40">
          © <span suppressHydrationWarning>{new Date().getFullYear()}</span> Kami Kulture •{" "}
          <a className="underline hover:text-white/70" href="/privacy">Privacy</a>
        </p>
      </section>
    </main>
  );
}
