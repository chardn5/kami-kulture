// src/app/api/orders/route.ts
import { NextResponse } from "next/server";
import { appendOrder, readOrders, OrderRow } from "@/lib/orderStore";

/** Basic Auth check for GET */
function isAuthorized(req: Request): boolean {
  const auth = req.headers.get("authorization") || "";
  const [scheme, b64] = auth.split(" ");
  if (scheme !== "Basic" || !b64) return false;
  try {
    const [u, p] = Buffer.from(b64, "base64").toString().split(":");
    return u === process.env.ADMIN_USER && p === process.env.ADMIN_PASS;
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  // Admin-only
  if (!isAuthorized(req)) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Orders API (GET)"' },
    });
  }
  const list = await readOrders();
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  // Public: used by PaySection after capture
  const body = (await req.json().catch(() => null)) as Partial<OrderRow> | null;
  if (!body?.orderId || !body?.amount) {
    return NextResponse.json(
      { ok: false, error: "orderId and amount required" },
      { status: 400 }
    );
  }

  const row: OrderRow = {
    time: new Date().toISOString(),
    orderId: String(body.orderId),
    amount: String(body.amount),
    currency: body.currency ? String(body.currency) : "USD",
    email: body.email ? String(body.email) : undefined,
    customId: body.customId ? String(body.customId) : undefined,
  };

  await appendOrder(row);
  return NextResponse.json({ ok: true });
}
