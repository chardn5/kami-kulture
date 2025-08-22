// /src/app/products/[slug]/loading.tsx
export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl bg-neutral-800 animate-pulse" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 w-16 rounded-xl bg-neutral-800 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-7 w-2/3 rounded bg-neutral-800 animate-pulse" />
          <div className="h-5 w-24 rounded bg-neutral-800 animate-pulse" />
          <div className="h-20 w-full rounded bg-neutral-800 animate-pulse" />
          <div className="h-10 w-64 rounded bg-neutral-800 animate-pulse" />
          <div className="h-12 w-60 rounded bg-neutral-800 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
