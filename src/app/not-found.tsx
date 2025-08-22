// /src/app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-white">
      <div className="rounded-2xl bg-neutral-900/70 p-10 text-center ring-1 ring-white/10">
        <h1 className="text-3xl font-semibold">404 — Page not found</h1>
        <p className="mt-2 text-neutral-300">
          The page you requested doesn’t exist or was moved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-emerald-500 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            Go home
          </Link>
          <Link
            href="/products"
            className="rounded-xl bg-neutral-800 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            Browse products
          </Link>
        </div>
      </div>
    </div>
  );
}
