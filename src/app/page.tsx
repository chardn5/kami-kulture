import Link from "next/link";
import Image from "next/image";
import ProductCard from "@/components/ProductCard";
import { products } from "@/data/products";

export const dynamic = "force-static";

export default function HomePage() {
  const featured = products.slice(0, 8);

  return (
    <div className="pb-20">
      <section className="pt-16 pb-10 text-center">
        <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight leading-none">
          <span className="text-white">KAMI </span>
          <span className="text-sky-400">KULTURE</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-white/80">
          Anime‑inspired memes & quotes on premium tees— printed on demand.
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

      {featured.length > 0 && (
        <section className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Featured</h2>
            <Link href="/products" className="text-sm text-white/80 hover:text-white underline underline-offset-4">
              View all
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => <ProductCard key={p.slug} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
