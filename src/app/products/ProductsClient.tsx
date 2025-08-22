'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/format';

type Product = {
  slug: string;
  title: string;
  price: number;
  description?: string;
  images?: string[];
  tags?: string[];                 // <-- add this
  createdAt?: string | number | Date;
};

type Props = {
  initialProducts: Product[];
  categories: string[];
};

type SortKey = 'price-asc' | 'price-desc' | 'newest';

export default function ProductsClient({ initialProducts, categories }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('newest');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = initialProducts.filter(p => {
      const inCat = category === 'all' || (p.tags?.includes(category) ?? false);
      if (!q) return inCat;
      const hay = `${p.title} ${p.description ?? ''}`.toLowerCase();
      return inCat && hay.includes(q);
    });

    list = [...list].sort((a, b) => {
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (db !== da) return db - da;
      return a.title.localeCompare(b.title);
    });

    return list;
  }, [initialProducts, query, category, sort]);

  const hasCategories = categories.length > 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-3 rounded-2xl bg-neutral-900/70 p-4 ring-1 ring-white/10 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <label htmlFor="q" className="sr-only">Search products</label>
          <input
            id="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search designs…"
            className="w-full rounded-xl bg-neutral-950 px-3 py-2 text-sm text-white ring-1 ring-white/10 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 md:max-w-sm"
          />

          {hasCategories && (
            <>
              <label htmlFor="cat" className="sr-only">Category</label>
              <select
                id="cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl bg-neutral-950 px-3 py-2 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="all">All</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:justify-end">
          <label htmlFor="sort" className="sr-only">Sort</label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-xl bg-neutral-950 px-3 py-2 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
          </select>
        </div>
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between text-sm text-neutral-400">
        <span>{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
        {(query || category !== 'all' || sort !== 'newest') && (
          <button
            onClick={() => { setQuery(''); setCategory('all'); setSort('newest'); }}
            className="rounded-lg px-2 py-1 text-neutral-300 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            Reset
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <li key={p.slug} className="group rounded-2xl bg-neutral-900/70 p-3 ring-1 ring-white/10">
              <Link href={`/products/${p.slug}`} className="block focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-xl">
                <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-lg">
                  <Image
                    src={p.images?.[0] ?? '/placeholder.jpg'}
                    alt={p.title}
                    fill
                    sizes="(max-width:768px) 50vw, (max-width:1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <p className="truncate text-sm text-white">{p.title}</p>
                <p className="text-xs text-neutral-400">{formatPrice(p.price)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-neutral-400">
      <p className="text-sm">No products match your filters.</p>
      <p className="text-xs">Try clearing the search or choosing a different tag.</p>
    </div>
  );
}
