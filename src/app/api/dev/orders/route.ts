import { NextResponse } from "next/server";
import { readOrders } from "@/lib/ordersLog";
import { cookies } from "next/headers";
import { createHash } from "crypto";

function expectedToken() {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return null; // if no password set, don't block (dev convenience)
  return createHash("sha256").update(pass).digest("base64url");
}

export async function GET() {
  const expected = expectedToken();
  const token = cookies().get("kk_admin")?.value ?? null;

  if (expected && token !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const orders = await readOrders();
  return NextResponse.json({ ok: true, orders });
}
