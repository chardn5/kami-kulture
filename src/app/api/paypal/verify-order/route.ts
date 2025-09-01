import { NextResponse } from "next/server";
import { appendOrder, OrderRow } from "@/lib/orderStore";

type VerifyReq = {
  orderId: string;
  expectedAmount: number;
  meta?: {
    productTitle?: string;
    selectedSize?: string;
    productSlug?: string;
    sku?: string;
    customId?: string;
    payerEmail?: string | null;
    currency?: string; // optional override
  };
};

function isVerifyReq(v: unknown): v is VerifyReq {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.orderId === "string" && typeof o.expectedAmount === "number";
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!isVerifyReq(body)) {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  // TODO: call PayPal Orders API here later to verify amount/currency.
  // For now we trust the client for sandbox/MVP and *persist the order server-side*:
  const row: OrderRow = {
    time: new Date().toISOString(),
    orderId: body.orderId,
    amount: body.expectedAmount.toFixed(2),
    currency: body.meta?.currency ?? "USD",
    email: body.meta?.payerEmail ?? undefined,
    customId: body.meta?.customId ?? undefined,
  };
  try {
    await appendOrder(row);
    // console.log(`[verify-order] appended ${row.orderId} -> ${row.amount} ${row.currency}`);
  } catch  {
    // If writing fails we still return 200, but include a hint for logs
    return NextResponse.json({ ok: true, warn: "append-failed" });
  }

  return NextResponse.json({ ok: true });
}
