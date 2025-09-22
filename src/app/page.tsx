// /src/app/page.tsx
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { products } from "@/data/products";

export const dynamic = "force-static";

export default function HomePage() {
  const featured = products.slice(0, 8);

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-12 md:pt-24 md:pb-16 text-center">
        {/* background layers */}
        <div className="absolute inset-0 -z-10">
          {/* soft radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_-20%,rgba(56,189,248,0.22),transparent_60%)]" />
          {/* faint grid with radial mask */}
          <div className="absolute inset-0 opacity-[0.07] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] bg-[linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:32px_32px]" />
          {/* subtle bottom vignette */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.35))]" />
        </div>

        <div className="mx-auto max-w-6xl px-4">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-none">
            <span className="text-white">KAMI </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-blue-500">
              KULTURE
            </span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/80">
            Anime-inspired memes & quotes on premium tees — printed on demand.
          </p>
          <div className="mt-8 flex items-center justify-center">
            <Link
              href="/products"
              className="inline-block rounded-xl bg-white text-black px-6 py-3 text-sm font-semibold shadow-sm hover:shadow-md transition"
            >
              Shop products
            </Link>
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4 px-4 md:px-0 max-w-6xl mx-auto">
            <h2 className="text-xl font-semibold">Featured</h2>
            <Link
              href="/products"
              className="text-sm text-white/80 hover:text-white underline underline-offset-4"
            >
              View all
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto px-4 md:px-0">
            {featured.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
