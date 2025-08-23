// src/app/api/orders/route.ts
import { NextResponse } from "next/server";
import { appendOrder, readOrders, OrderRow } from "@/lib/orderStore";

function isAuthorized(req: Request) {
  // Optional: keep public POST (from PDP) and restrict GET to admin via Basic Auth
  const auth = req.headers.get("authorization") || "";
  const [scheme, b64] = auth.split(" ");
  if (scheme !== "Basic" || !b64) return false;
  const [u, p] = Buffer.from(b64, "base64").toString().split(":");
  return u === process.env.ADMIN_USER && p === process.env.ADMIN_PASS;
}

export async function GET(req: Request) {
  // If you already gate /admin/* with middleware, you can relax this.
  if (!isAuthorized(req)) return new NextResponse("Unauthorized", { status: 401 });
  const list = await readOrders();
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  // expects { orderId, amount, currency, email, customId }
  const body = await req.json().catch(() => ({}));
  const { orderId, amount, currency, email, customId } = body || {};
  if (!orderId || !amount) {
    return NextResponse.json({ ok: false, error: "orderId and amount required" }, { status: 400 });
  }
  const row: OrderRow = {
    time: new Date().toISOString(),
    orderId: String(orderId),
    amount: String(amount),
    currency: currency ? String(currency) : undefined,
    email: email ? String(email) : undefined,
    customId: customId ? String(customId) : undefined,
  };
  await appendOrder(row);
  return NextResponse.json({ ok: true });
}
