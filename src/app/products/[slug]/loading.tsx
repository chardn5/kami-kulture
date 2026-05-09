// /src/app/products/[slug]/loading.tsx
export default function ProductLoading() {
  return (
    <div className="kk-container py-8 lg:py-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-3">
          <div className="aspect-[4/5] rounded-lg bg-[#171711] animate-pulse md:aspect-square" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 w-16 rounded-md bg-[#171711] animate-pulse" />
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-5">
          <div className="h-7 w-2/3 rounded-md bg-[#0f0f0c] animate-pulse" />
          <div className="h-5 w-24 rounded-md bg-[#0f0f0c] animate-pulse" />
          <div className="h-20 w-full rounded-md bg-[#0f0f0c] animate-pulse" />
          <div className="h-10 w-64 rounded-md bg-[#0f0f0c] animate-pulse" />
          <div className="h-12 w-60 rounded-md bg-[#0f0f0c] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
