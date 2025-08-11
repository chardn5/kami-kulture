import { NextRequest, NextResponse } from "next/server";
import { capturePaypalOrderServer } from "@/lib/paypal";

export async function POST(req: NextRequest) {
  try {
    const { orderID } = await req.json();
    if (!orderID) return NextResponse.json({ error: "Missing orderID" }, { status: 400 });

    const result = await capturePaypalOrderServer(orderID);

    // TODO: send yourself an email here with order details (Resend/Mailgun) or
    // save to DB so you can fulfill in Printify. For now we just return the capture.
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "error" }, { status: 500 });
  }
}
