// src/app/api/dev/orders/route.ts
import { NextResponse } from "next/server";
import { readOrders } from "@/lib/orderStore";
import { cookies } from "next/headers";
import { createHash } from "crypto";

function expectedToken(): string | null {
  const pass = process.env.ADMIN_PASS || process.env.ADMIN_PASSWORD;
  return pass ? createHash("sha256").update(pass).digest("base64url") : null;
}

type Entry = {
  ts: number;
  orderId: string;
  amount: number;
  currency: string;
  payerEmail: string | null;
  customId: string | null;
};

export async function GET() {
  const expected = expectedToken();
  if (expected) {
    const cookieStore = await cookies(); // Next 15: async
    const token = cookieStore.get("kk_admin")?.value ?? null;
    if (token !== expected) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const rows = await readOrders().catch(() => []);
  const orders: Entry[] = rows.map((r) => ({
    ts: Date.parse(r.time),
    orderId: r.orderId,
    amount: Number(r.amount),
    currency: r.currency ?? "USD",
    payerEmail: r.email ?? null,
    customId: r.customId ?? null,
  }));

  return NextResponse.json({ ok: true, orders });
}
