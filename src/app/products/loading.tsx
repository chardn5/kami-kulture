// /src/app/products/loading.tsx
export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 h-7 w-40 animate-pulse rounded bg-neutral-800" />

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="h-10 animate-pulse rounded-xl bg-neutral-900 ring-1 ring-white/10" />
        <div className="h-10 animate-pulse rounded-xl bg-neutral-900 ring-1 ring-white/10" />
        <div className="h-10 animate-pulse rounded-xl bg-neutral-900 ring-1 ring-white/10" />
      </div>

      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="rounded-2xl bg-neutral-900/70 p-3 ring-1 ring-white/10">
            <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-lg bg-neutral-800 animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-neutral-800 animate-pulse" />
            <div className="mt-2 h-3 w-1/3 rounded bg-neutral-800 animate-pulse" />
          </li>
        ))}
      </ul>
    </div>
  );
}
