import { NextResponse } from "next/server";
import { createPaypalOrderServer } from "@/lib/paypal";

// MVP: one product for $24.99 — server decides the amount.
const PRODUCT_PRICE_USD = "24.99";

export async function POST() {
  try {
    const order = await createPaypalOrderServer(PRODUCT_PRICE_USD);
    return NextResponse.json({ id: order.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "error" }, { status: 500 });
  }
}
