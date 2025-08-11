// src/app/api/paypal/create-order/route.ts
import { NextResponse } from "next/server";
import { createPaypalOrderServer } from "@/lib/paypal";

const PRODUCT_PRICE_USD = "24.99";

export async function POST() {
  try {
    const order = await createPaypalOrderServer(PRODUCT_PRICE_USD);
    // order.id exists in PayPal response
    return NextResponse.json({ id: (order as { id: string }).id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
