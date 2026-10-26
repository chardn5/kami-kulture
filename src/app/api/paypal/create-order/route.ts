import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readQuote, checkoutError } from "@/lib/checkout";
import { paypalRequest } from "@/lib/paypalServer";
import { rateLimit } from "@/lib/rateLimit";
import { hasPaymentTestItem } from '@/lib/paymentTest';

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!rateLimit(`payment-create:${ip}`, 10, 60_000).ok)
    return NextResponse.json(
      { error: "Please wait a moment and try again." },
      { status: 429 },
    );
  try {
    const body = await req.json();
    const quote = readQuote(body.quoteToken);
    const c = quote.customer;
    const paymentTest = hasPaymentTestItem(quote.items);
    // Save the signed snapshot before opening PayPal so capture never trusts browser prices.
    await prisma.order.upsert({
      where: { id: quote.id },
      update: {},
      create: {
        id: quote.id,
        status: "PENDING_PAYMENT",
        currency: quote.currency,
        amountTotal: quote.total,
        amountSubtotal: quote.subtotal,
        amountShipping: quote.shipping,
        amountTax: quote.tax,
        buyerEmail: c.email,
        shipEmail: c.email,
        shipFirstName: c.firstName,
        shipLastName: c.lastName,
        shipPhone: c.phone,
        shipAddress1: c.address1,
        shipAddress2: c.address2,
        shipCity: c.city,
        shipState: c.state,
        shipPostalCode: c.postalCode,
        shipCountry: c.country,
        raw: { checkout: quote as unknown as Prisma.InputJsonValue },
        items: {
          create: quote.items.map((i) => ({
            sku: i.sku,
            title: i.title,
            qty: i.qty,
            unitPrice: i.price,
            size: i.size,
            color: i.color,
            image: i.image,
            printifyProductId: i.printifyProductId || undefined,
            printifyVariantId: i.printifyVariantId || undefined,
          })),
        },
      },
    });
    const order = await paypalRequest<{ id: string }>(
      "/v2/checkout/orders",
      "POST",
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            custom_id: quote.id,
            items: quote.items.map((i) => ({
              name: paymentTest ? i.title : `${i.title} - ${i.color} / ${i.size}`,
              sku: i.sku,
              quantity: String(i.qty),
              category: paymentTest ? "DIGITAL_GOODS" : "PHYSICAL_GOODS",
              unit_amount: {
                currency_code: quote.currency,
                value: i.price.toFixed(2),
              },
            })),
            amount: {
              currency_code: quote.currency,
              value: quote.total.toFixed(2),
              breakdown: {
                item_total: {
                  currency_code: quote.currency,
                  value: quote.subtotal.toFixed(2),
                },
                shipping: {
                  currency_code: quote.currency,
                  value: quote.shipping.toFixed(2),
                },
                tax_total: {
                  currency_code: quote.currency,
                  value: quote.tax.toFixed(2),
                },
              },
            },
            ...(!paymentTest ? { shipping: {
              name: { full_name: `${c.firstName} ${c.lastName}` },
              address: {
                address_line_1: c.address1,
                address_line_2: c.address2 || undefined,
                admin_area_1: c.state || undefined,
                admin_area_2: c.city,
                postal_code: c.postalCode,
                country_code: c.country,
              },
            } } : {}),
          },
        ],
        application_context: {
          shipping_preference: paymentTest ? "NO_SHIPPING" : "SET_PROVIDED_ADDRESS",
          user_action: "PAY_NOW",
        },
      },
      `create-${quote.id}`,
    );
    if (!order.id) throw new Error("PAYPAL_REQUEST_FAILED");
    await prisma.order.update({ where: { id: quote.id }, data: { paypalOrderId: order.id } });
    return NextResponse.json({ ok: true, id: order.id });
  } catch (error) {
    console.error(
      "[checkout] create failed",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json(
      { ok: false, error: checkoutError(error) },
      { status: 400 },
    );
  }
}
