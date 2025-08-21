import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { products } from "@/data/products";

export const dynamic = "force-static";

// Simple inline icons
function IconTruck() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="M10 17h4" />
      <path d="M3 17h2l1-3h9l1 3h2" />
      <path d="M5 17a2 2 0 1 0 4 0" />
      <path d="M15 17a2 2 0 1 0 4 0" />
      <path d="M16 14V6H3v11" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="M12 3l7 4v5c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V7l7-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function IconRefresh() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export default function HomePage() {
  const featured = products.slice(0, 8);

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="pt-16 pb-10 text-center">
        <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight leading-none">
          <span className="text-white">KAMI </span>
          <span className="text-sky-400">KULTURE</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-white/80">
          Anime‑inspired memes & quotes on premium tees — printed on demand.
        </p>
        <div className="mt-8 flex items-center justify-center">
          <Link
            href="/products"
            className="inline-block rounded-lg bg-white text-black px-5 py-2.5 text-sm font-semibold shadow hover:shadow-md transition"
          >
            Shop products
          </Link>
        </div>
      </section>

      {/* Trust row */}
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 border border-white/15 rounded-lg p-3 bg-white/5">
          <IconTruck />
          <p className="text-sm text-white/90">Fast PH shipping</p>
        </div>
        <div className="flex items-center gap-3 border border-white/15 rounded-lg p-3 bg-white/5">
          <IconShield />
          <p className="text-sm text-white/90">Secure payments (PayPal sandbox)</p>
        </div>
        <div className="flex items-center gap-3 border border-white/15 rounded-lg p-3 bg-white/5">
          <IconRefresh />
          <p className="text-sm text-white/90">Easy exchanges within 7 days</p>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Featured</h2>
            <Link href="/products" className="text-sm text-white/80 hover:text-white underline underline-offset-4">
              View all
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
