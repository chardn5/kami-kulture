// src/app/api/dev/orders/route.ts
import { NextResponse } from "next/server";
import { readOrders } from "@/lib/orderStore"; // <-- use the JSON store used by /api/orders
import { cookies as cookiesFn } from "next/headers";
import { createHash } from "crypto";

function expectedToken(): string | null {
  const pass = process.env.ADMIN_PASS || process.env.ADMIN_PASSWORD;
  if (!pass) return null; // if not set, don't block (dev convenience)
  return createHash("sha256").update(pass).digest("base64url");
}

/** Get cookies() in a way that works for Next 14 (sync) and 15 (async). */
async function getCookieStore() {
  try {
    // Next 14: cookies() is sync
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return (cookiesFn as unknown as () => ReturnType<typeof cookiesFn>)();
  } catch {
    // Next 15: cookies() is async
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await (cookiesFn as unknown as () => Promise<ReturnType<typeof cookiesFn>) )();
  }
}

export async function GET() {
  // --- Optional cookie gate (dev) ---
  const expected = expectedToken();
  if (expected) {
    const cookieStore = await getCookieStore();
    const token = cookieStore.get("kk_admin")?.value ?? null;
    if (token !== expected) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  // --- Read & map to OrdersClient shape ---
  let rows: Awaited<ReturnType<typeof readOrders>> = [];
  try {
    rows = await readOrders();
  } catch {
    rows = [];
  }

  const orders = rows.map((r) => ({
    ts: Date.parse(r.time),                                   // number
    orderId: r.orderId,                                       // string
    amount: Number(typeof r.amount === "string" ? r.amount : r.amount), // number
    currency: r.currency ?? "USD",                            // string
    payerEmail: r.email ?? null,                              // string | null
    customId: r.customId ?? null,                             // string | null
  }));

  return NextResponse.json({ ok: true, orders });
}
