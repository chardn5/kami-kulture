import { NextRequest, NextResponse } from "next/server";
import { buildCheckoutQuote, signQuote, checkoutError } from "@/lib/checkout";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!rateLimit(`quote:${ip}`, 15, 60_000).ok)
    return NextResponse.json(
      { error: "Please wait a moment before requesting another quote." },
      { status: 429 },
    );
  try {
    const quote = await buildCheckoutQuote(await req.json());
    return NextResponse.json(
      {
        token: signQuote(quote),
        expiresAt: quote.expiresAt,
        items: quote.items,
        pricing: {
          subtotal: quote.subtotal,
          shipping: quote.shipping,
          tax: quote.tax,
          total: quote.total,
        },
        ...(quote.personalOffer ? { personalOffer: { retailSubtotal: quote.personalOffer.retailSubtotal, discount: quote.personalOffer.discount } } : {}),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "[checkout] quote failed",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json({ error: checkoutError(error) }, { status: 422 });
  }
}
