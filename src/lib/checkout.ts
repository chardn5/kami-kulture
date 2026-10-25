import { randomBytes } from "node:crypto";
import { getCatalogProducts } from "./catalog";
import { calculateShipping, getProduct, getEnvShopId } from "./printify";
import {
  checkoutCustomerSchema,
  cartRequestSchema,
  type CheckoutCustomer,
} from "./checkoutSchema";
import { checkoutSigningSecret, paypalEnvironment } from "./paypalServer";
import { signCheckout, verifyCheckout } from "./checkoutSecurity";

export type VerifiedLine = {
  sku: string;
  title: string;
  price: number;
  qty: number;
  color?: string;
  size?: string;
  image?: string;
  printifyProductId: string;
  printifyVariantId: number;
};
export type CheckoutQuote = {
  id: string;
  expiresAt: number;
  environment: string;
  customer: CheckoutCustomer;
  items: VerifiedLine[];
  currency: "USD";
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingMethod: number;
};

type QuoteDependencies = {
  getCatalogProducts: typeof getCatalogProducts;
  getProduct: typeof getProduct;
  calculateShipping: typeof calculateShipping;
  getEnvShopId: typeof getEnvShopId;
};
const quoteDependencies: QuoteDependencies = {
  getCatalogProducts,
  getProduct,
  calculateShipping,
  getEnvShopId,
};

export async function buildCheckoutQuote(
  input: { cart?: unknown; customer?: unknown },
  deps: QuoteDependencies = quoteDependencies,
): Promise<CheckoutQuote> {
  const customer = checkoutCustomerSchema.parse(input.customer);
  const requested = cartRequestSchema.parse(input.cart);
  const catalog = await deps.getCatalogProducts();
  const merged = new Map<string, number>();
  requested.forEach((line) =>
    merged.set(line.sku, (merged.get(line.sku) ?? 0) + line.qty),
  );
  const items: VerifiedLine[] = Array.from(merged, ([sku, qty]) => {
    const product = catalog.find((p) => p.variants?.some((v) => v.sku === sku));
    const variant = product?.variants?.find((v) => v.sku === sku);
    if (
      !product ||
      !variant?.isAvailable ||
      !variant.variantId ||
      !variant.printifyProductId
    )
      throw new Error("VARIANT_UNAVAILABLE");
    return {
      sku,
      qty,
      title: product.title,
      price: product.price,
      color: variant.color,
      size: variant.size,
      image: variant.images?.[0] ?? product.images[0],
      printifyProductId: variant.printifyProductId,
      printifyVariantId: variant.variantId,
    };
  });
  const shop = deps.getEnvShopId();
  const products = await Promise.all(
    Array.from(new Set(items.map((i) => i.printifyProductId)), (id) =>
      deps.getProduct(shop, id),
    ),
  );
  for (const line of items) {
    const product = products.find((p) => p.id === line.printifyProductId);
    const variant = product?.variants.find(
      (v) => v.id === line.printifyVariantId,
    );
    if (!variant?.is_enabled || !variant.is_available)
      throw new Error("VARIANT_UNAVAILABLE");
  }
  const rates = await deps.calculateShipping(shop, {
    line_items: items.map((i) => ({
      product_id: i.printifyProductId,
      variant_id: i.printifyVariantId,
      quantity: i.qty,
    })),
    address_to: {
      first_name: customer.firstName,
      last_name: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      address1: customer.address1,
      address2: customer.address2,
      city: customer.city,
      region: customer.state,
      zip: customer.postalCode,
      country: customer.country,
    },
  });
  if (
    typeof rates.standard !== "number" ||
    !Number.isSafeInteger(rates.standard) ||
    rates.standard < 0
  )
    throw new Error("SHIPPING_UNAVAILABLE");
  const subtotalCents = items.reduce(
    (sum, i) => sum + Math.round(i.price * 100) * i.qty,
    0,
  );
  return {
    id: `KK-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${randomBytes(8).toString("hex").toUpperCase()}`,
    expiresAt: Date.now() + 15 * 60_000,
    environment: paypalEnvironment(),
    customer,
    items,
    currency: "USD",
    subtotal: subtotalCents / 100,
    shipping: rates.standard / 100,
    tax: 0,
    total: (subtotalCents + rates.standard) / 100,
    shippingMethod: 1,
  };
}

export function signQuote(quote: CheckoutQuote) {
  return signCheckout(quote, checkoutSigningSecret());
}
export function readQuote(token: string) {
  const quote = verifyCheckout<CheckoutQuote>(token, checkoutSigningSecret());
  if (quote.environment !== paypalEnvironment())
    throw new Error("QUOTE_INVALID");
  return quote;
}

export function checkoutError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    VARIANT_UNAVAILABLE:
      "One of these sizes or colors is no longer available. Please return to the product page and choose another option.",
    SHIPPING_UNAVAILABLE:
      "Standard shipping is not available for this address. Please contact support for help.",
    PRINTIFY_AUTH_FAILED:
      "Shipping quotes are temporarily unavailable. Please try again later or contact support.",
    PRINTIFY_UNAVAILABLE:
      "We could not confirm shipping for this address. Check your details and try again, or contact support.",
    QUOTE_EXPIRED:
      "Your shipping quote has expired. Please refresh the quote before paying.",
    QUOTE_INVALID: "Please refresh your shipping quote before paying.",
  };
  return (
    messages[code] ??
    "We could not prepare your order. Please check your details and try again."
  );
}
