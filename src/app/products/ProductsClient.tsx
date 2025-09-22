// /src/app/products/ProductsClient.tsx
'use client';

import { useMemo, useState } from 'react';
import ProductCard from '@/components/ProductCard';

type Product = {
  slug: string;
  title: string;
  price: number;
  description?: string;
  images?: string[];
  tags?: string[];
  createdAt?: string | number | Date;
  rating?: number;       // 0–5 (optional)
  ratingCount?: number;  // optional
};

type Props = {
  initialProducts: Product[];
  categories: string[];
};

type SortKey =
  | 'newest'
  | 'price-asc'
  | 'price-desc'
  | 'alpha-asc'
  | 'alpha-desc'
  | 'rating-desc'
  | 'rating-asc';

export default function ProductsClient({ initialProducts, categories }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('newest');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = initialProducts.filter((p) => {
      const inCat =
        category === 'all' ||
        (p.tags?.map((t) => t.toLowerCase()).includes(category.toLowerCase()) ?? false);

      if (!q) return inCat;
      const hay = `${p.title} ${p.description ?? ''}`.toLowerCase();
      return inCat && hay.includes(q);
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'alpha-asc':
          return a.title.localeCompare(b.title);
        case 'alpha-desc':
          return b.title.localeCompare(a.title);
        case 'rating-desc': {
          const ra = typeof a.rating === 'number' ? a.rating : -1;
          const rb = typeof b.rating === 'number' ? b.rating : -1;
          if (rb !== ra) return rb - ra; // high → low
          return a.title.localeCompare(b.title);
        }
        case 'rating-asc': {
          const ra = typeof a.rating === 'number' ? a.rating : Number.POSITIVE_INFINITY;
          const rb = typeof b.rating === 'number' ? b.rating : Number.POSITIVE_INFINITY;
          if (ra !== rb) return ra - rb; // low → high
          return a.title.localeCompare(b.title);
        }
        case 'newest':
        default: {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (db !== da) return db - da; // newest first
          return a.title.localeCompare(b.title);
        }
      }
    });

    return list;
  }, [initialProducts, query, category, sort]);

  const active = {
    query: query.trim() !== '',
    category: category !== 'all',
    sort: sort !== 'newest',
  };

  const inputCls =
    'w-full rounded-lg border bg-white/10 text-white placeholder-white/60 ' +
    'border-white/15 focus:border-white/25 px-10 py-2.5 ' +
    'focus:outline-none focus:ring-2 focus:ring-sky-400/60';
  const selectCls =
    'w-full appearance-none rounded-lg border bg白/10 text-white ' +
    'border-white/15 focus:border-white/25 px-3 py-2.5 pr-9 ' +
    'focus:outline-none focus:ring-2 focus:ring-sky-400/60'
      .replace('白', 'white'); // prevent accidental unicode variant

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">All Products</h1>
        <p className="mt-1 text-sm text-white/60">
          {filtered.length} result{filtered.length === 1 ? '' : 's'}
          {active.query ? <> for “{query}”</> : null}
          {active.category ? <> in {category}</> : null}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-12">
        {/* Search */}
        <label className="md:col-span-5 relative block">
          <span className="sr-only">Search products</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or description…"
            className={inputCls}
          />
          {/* search icon */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/70"
            width="18"
            height="18"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M10 2a8 8 0 0 1 6.32 12.9l5.39 5.39-1.41 1.41-5.39-5.39A8 8 0 1 1 10 2m0 2a6 6 0 1 0 0 12A6 6 0 0 0 10 4z"
            />
          </svg>
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-white/70 hover:text-white hover:bg-white/10"
            >
              ✕
            </button>
          )}
        </label>

        {/* Category (only render if provided) */}
        {categories.length > 0 && (
          <div className="md:col-span-4 relative">
            <label className="sr-only" htmlFor="cat">
              Category
            </label>
            <select
              id="cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={selectCls}
              style={{ WebkitTextFillColor: '#fff' }}
            >
              <option value="all">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {/* chevron */}
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70"
              width="18"
              height="18"
              viewBox="0 0 24 24"
            >
              <path fill="currentColor" d="M7 10l5 5 5-5z" />
            </svg>
          </div>
        )}

        {/* Sort */}
        <div className="md:col-span-3 relative">
          <label className="sr-only" htmlFor="sort">
            Sort
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className={selectCls}
            style={{ WebkitTextFillColor: '#fff' }}
          >
            <option value="newest">Newest</option>
            <option value="alpha-asc">Name: A → Z</option>
            <option value="alpha-desc">Name: Z → A</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
            <option value="rating-desc">Rating: High → Low</option>
            <option value="rating-asc">Rating: Low → High</option>
          </select>
          {/* chevron */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70"
            width="18"
            height="18"
            viewBox="0 0 24 24"
          >
            <path fill="currentColor" d="M7 10l5 5 5-5z" />
          </svg>
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard
              key={p.slug}
              product={{
                slug: p.slug,
                title: p.title,
                price: p.price,
                images: p.images ?? [],        // provide default [] to satisfy type
                description: p.description,
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          onClear={() => {
            setQuery('');
            setCategory('all');
            setSort('newest');
          }}
        />
      )}
    </main>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
      <h3 className="text-lg font-semibold">No products found</h3>
      <p className="mt-2 text-sm text-white/70">
        Try clearing filters or using a different search.
      </p>
      <button
        onClick={onClear}
        className="mt-4 inline-flex items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
      >
        Reset filters
      </button>
    </div>
  );
}
