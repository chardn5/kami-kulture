import { NextRequest, NextResponse } from "next/server";
import { capturePaypalOrderServer } from "@/lib/paypal";

export async function POST(req: NextRequest) {
  try {
    const { orderID } = await req.json();
    if (!orderID) {
      return NextResponse.json({ error: "Missing orderID" }, { status: 400 });
    }
    const result = await capturePaypalOrderServer(orderID);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
