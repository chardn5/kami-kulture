// /src/app/products/loading.tsx
export default function ProductsLoading() {
  return (
    <div className="kk-container py-10">
      <div className="mb-6 h-9 w-48 animate-pulse rounded-md bg-[#171711]" />

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="h-10 animate-pulse rounded-md bg-[#171711] ring-1 ring-[#f7f1df]/10" />
        <div className="h-10 animate-pulse rounded-md bg-[#171711] ring-1 ring-[#f7f1df]/10" />
        <div className="h-10 animate-pulse rounded-md bg-[#171711] ring-1 ring-[#f7f1df]/10" />
      </div>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="rounded-lg bg-[#171711] p-3 ring-1 ring-[#f7f1df]/10">
            <div className="relative mb-3 aspect-[4/5] w-full overflow-hidden rounded-md bg-[#0f0f0c] animate-pulse" />
            <div className="h-4 w-3/4 rounded-md bg-[#0f0f0c] animate-pulse" />
            <div className="mt-2 h-3 w-1/3 rounded-md bg-[#0f0f0c] animate-pulse" />
          </li>
        ))}
      </ul>
    </div>
  );
}
