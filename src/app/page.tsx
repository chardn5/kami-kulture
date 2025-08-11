export const metadata = {
  title: "Kami Kulture — Coming Soon",
  description: "Anime-inspired memes & quotes. Launching soon.",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* subtle gradient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.25),transparent_60%)]" />
      <div className="relative mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Kami <span className="text-sky-400">Kulture</span>
        </h1>
        <p className="mt-4 text-lg text-gray-300">
          Anime‑inspired memes & quotes. New drops soon. Be first to know.
        </p>

        {/* Email capture */}
        <form
          action="https://formspree.io/f/xjkojqjz"
          method="POST"
          className="mt-8 flex w-full max-w-lg gap-2"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="your@email.com"
            className="w-full flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-400 outline-none focus:border-sky-400"
          />
          <button
            type="submit"
            className="rounded-xl bg-sky-500 px-5 py-3 font-semibold hover:bg-sky-400"
          >
            Notify me
          </button>
        </form>

        <p className="mt-3 text-xs text-gray-400">
          No spam. Unsubscribe anytime.
        </p>

        {/* Social placeholders */}
        <div className="mt-10 flex gap-5 text-gray-400">
          <a href="#" aria-label="Instagram" className="hover:text-white">Instagram</a>
          <a href="#" aria-label="TikTok" className="hover:text-white">TikTok</a>
          <a href="#" aria-label="X" className="hover:text-white">X/Twitter</a>
        </div>

        <footer className="mt-16 text-xs text-gray-500">
          © {new Date().getFullYear()} Kami Kulture
        </footer>
      </div>
    </main>
  );
}
