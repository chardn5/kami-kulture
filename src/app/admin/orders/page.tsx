// src/app/admin/orders/page.tsx
import Link from "next/link";

type Row = {
  time: string;
  orderId: string;
  amount: string;
  currency?: string;
  email?: string;
  customId?: string;
};

export const dynamic = "force-dynamic"; // avoid caching

async function getOrders(): Promise<Row[]> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  const user = process.env.ADMIN_USER ?? "";
  const pass = process.env.ADMIN_PASS ?? "";
  const headers: Record<string, string> = {};

  if (user && pass) {
    const token = Buffer.from(`${user}:${pass}`).toString("base64");
    headers["Authorization"] = `Basic ${token}`;
  }

  try {
    const res = await fetch(`${baseUrl}/api/orders`, { cache: "no-store", headers });
    if (!res.ok) return [];
    const data = (await res.json()) as Row[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function AdminOrdersPage() {
  const rows = await getOrders();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders (dev)</h1>
        <Link href="/" className="text-sm underline opacity-80 hover:opacity-100">
          Back to site
        </Link>
      </div>
      <p className="mb-4 text-sm opacity-70">
        Newest first. File path: <code>.data/orders.json</code> (dev) /{" "}
        <code>/tmp/orders.json</code> (prod).
      </p>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Order ID</th>
              <th className="px-4 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Custom ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center opacity-70" colSpan={5}>
                  No orders logged yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={`${r.orderId}-${r.time}`} className="odd:bg-white/[0.02]">
                  <td className="px-4 py-3">{new Date(r.time).toLocaleString()}</td>
                  <td className="px-4 py-3">{r.orderId}</td>
                  <td className="px-4 py-3">
                    {(r.currency ?? "USD") + " " + r.amount}
                  </td>
                  <td className="px-4 py-3">{r.email ?? "—"}</td>
                  <td className="px-4 py-3">{r.customId ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
