// /src/app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="kk-container py-16 text-[#f7f1df]">
      <div className="rounded-lg border border-[#f7f1df]/12 bg-[#171711] p-10 text-center">
        <h1 className="text-3xl font-black">404: Page not found</h1>
        <p className="mt-2 text-[#f7f1df]/64">
          The page you requested doesn’t exist or was moved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="kk-focus rounded-md bg-[#f7f1df] px-4 py-2 text-sm font-black text-black hover:bg-[#d6ff57]"
          >
            Go home
          </Link>
          <Link
            href="/products"
            className="kk-focus rounded-md border border-[#f7f1df]/16 px-4 py-2 text-sm font-semibold hover:bg-[#f7f1df]/8"
          >
            Browse products
          </Link>
        </div>
      </div>
    </div>
  );
}
