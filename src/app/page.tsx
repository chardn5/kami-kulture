import Link from 'next/link';
import Image from 'next/image';
import { products } from '@/data/products';
import { formatPrice } from '@/lib/format';

export default function Home() {
  const featured = products.slice(0, 2);

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <section className="text-center">
        <h1 className="wordmark text-center">
  <span className="w1">KAMI </span>
  <span className="w2">KULTURE</span>
</h1>


        <p className="mt-3 text-slate-400">
          Anime-inspired memes & quotes on premium tees— printed on demand.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/products"
            className="inline-flex items-center rounded-md bg-white px-5 py-2.5 text-sm font-medium text-black hover:opacity-90"
          >
            Shop products
          </Link>
          <Link
            href="/designs"
            className="inline-flex items-center rounded-md border border-white/20 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5"
          >
            Explore designs
          </Link>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Featured</h2>
          <Link href="/products" className="text-sm text-slate-300 hover:underline">View all</Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <Link key={p.slug} href={`/products/${p.slug}`} className="group block">
              <div className="relative h-[260px] w-full overflow-hidden rounded-2xl border border-white/10">
                <Image
                  src={p.images[0]}
                  alt={p.title}
                  fill
                  className="object-contain bg-white transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-200">{p.title}</h3>
                <span className="text-sm text-slate-300">{formatPrice(p.price)}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
