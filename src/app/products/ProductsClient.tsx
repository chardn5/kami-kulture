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
  rating?: number;
  ratingCount?: number;
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

const sortLabels: Record<SortKey, string> = {
  newest: 'Newest',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  'alpha-asc': 'Name: A-Z',
  'alpha-desc': 'Name: Z-A',
  'rating-desc': 'Rating: high to low',
  'rating-asc': 'Rating: low to high',
};

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
          if (rb !== ra) return rb - ra;
          return a.title.localeCompare(b.title);
        }
        case 'rating-asc': {
          const ra = typeof a.rating === 'number' ? a.rating : Number.POSITIVE_INFINITY;
          const rb = typeof b.rating === 'number' ? b.rating : Number.POSITIVE_INFINITY;
          if (ra !== rb) return ra - rb;
          return a.title.localeCompare(b.title);
        }
        case 'newest':
        default: {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (db !== da) return db - da;
          return a.title.localeCompare(b.title);
        }
      }
    });

    return list;
  }, [initialProducts, query, category, sort]);

  const hasFilters = query.trim() !== '' || category !== 'all' || sort !== 'newest';

  return (
    <main className="kk-container py-10">
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-[#ff4f5f]">Shop</p>
          <h1 className="mt-2 text-4xl font-black text-[#f7f1df]">All Products</h1>
          <p className="mt-2 text-sm text-[#f7f1df]/62">
            {filtered.length} result{filtered.length === 1 ? '' : 's'} from the current drop.
          </p>
        </div>

        <label className="block w-full md:w-80">
          <span className="mb-2 block text-xs font-black uppercase text-[#f7f1df]/58">
            Search designs
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title or description"
            className="h-11 w-full rounded-md border border-[#f7f1df]/16 bg-[#171711] px-3 text-sm text-[#f7f1df] placeholder:text-[#f7f1df]/38"
          />
        </label>
      </div>

      <div className="mb-8 flex flex-col gap-4 border-y border-[#f7f1df]/10 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={`kk-focus h-9 rounded-md px-3 text-sm font-semibold ${
              category === 'all'
                ? 'bg-[#f7f1df] text-black'
                : 'border border-[#f7f1df]/14 text-[#f7f1df]/72 hover:bg-[#f7f1df]/8'
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`kk-focus h-9 rounded-md px-3 text-sm font-semibold ${
                category === c
                  ? 'bg-[#d6ff57] text-black'
                  : 'border border-[#f7f1df]/14 text-[#f7f1df]/72 hover:bg-[#f7f1df]/8'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="sort" className="text-xs font-black uppercase text-[#f7f1df]/58">
            Sort
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-10 rounded-md border border-[#f7f1df]/16 bg-[#171711] px-3 text-sm text-[#f7f1df]"
          >
            {Object.entries(sortLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard
              key={p.slug}
              product={{
                slug: p.slug,
                title: p.title,
                price: p.price,
                images: p.images ?? [],
                description: p.description,
                tags: p.tags,
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          hasFilters={hasFilters}
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

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-8 text-center">
      <h3 className="text-lg font-black text-[#f7f1df]">No products found</h3>
      <p className="mt-2 text-sm text-[#f7f1df]/62">
        Try a different search or clear the active filters.
      </p>
      {hasFilters ? (
        <button
          onClick={onClear}
          className="kk-focus mt-5 inline-flex h-10 items-center justify-center rounded-md bg-[#f7f1df] px-4 text-sm font-black text-black"
        >
          Reset filters
        </button>
      ) : null}
    </div>
  );
}
