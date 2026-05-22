import { Prisma } from '@prisma/client';
import {
  createOrder as createPrintifyOrder,
  getEnvShopId,
  getOrder as getPrintifyOrder,
  type CreateOrderPayload,
  type PrintifyAddress,
  type PrintifyOrderLineItem,
} from '@/lib/printify';
import { prisma } from '@/lib/prisma';
import { products as staticProducts, type StaticProduct } from '@/data/products';

export type PrintifyFulfillmentLine = {
  id?: string;
  sku: string;
  title: string;
  qty: number;
  size?: string | null;
  color?: string | null;
  printifyProductId?: string | null;
  printifyVariantId?: number | null;
};

export type ShippingSnapshot = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

export type PrintifyReadiness = {
  ok: boolean;
  issues: string[];
};

export function isPrintifyAutoSubmitEnabled() {
  return ['1', 'true', 'yes'].includes((process.env.PRINTIFY_AUTO_SUBMIT ?? '').toLowerCase());
}

export function printifyShippingMethod() {
  const parsed = Number(process.env.PRINTIFY_SHIPPING_METHOD ?? 1);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function formatPrintifyError(error: unknown) {
  return error instanceof Error ? error.message : 'PRINTIFY_SUBMIT_FAILED';
}

function skuPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferStaticProduct(line: PrintifyFulfillmentLine): StaticProduct | undefined {
  const normalizedSku = skuPart(line.sku);
  const normalizedTitle = skuPart(line.title);

  return staticProducts.find(
    (product) =>
      normalizedSku.startsWith(skuPart(product.slug)) ||
      normalizedTitle === skuPart(product.title)
  );
}

function inferColor(line: PrintifyFulfillmentLine, product: StaticProduct) {
  if (line.color) return line.color;
  const normalizedSku = skuPart(line.sku);

  return (product.colors ?? [])
    .slice()
    .sort((a, b) => b.length - a.length)
    .find((color) => normalizedSku.includes(skuPart(color)));
}

function inferSize(line: PrintifyFulfillmentLine, product: StaticProduct) {
  if (line.size) return line.size;
  const normalizedSku = skuPart(line.sku);

  return (product.sizes ?? [])
    .slice()
    .sort((a, b) => b.length - a.length)
    .find((size) => normalizedSku.endsWith(`-${skuPart(size)}`) || normalizedSku.includes(`-${skuPart(size)}-`));
}

function staticPrintifyMapping(line: PrintifyFulfillmentLine) {
  const product = inferStaticProduct(line);
  if (!product?.printifyId) return null;

  const color = inferColor(line, product);
  const size = inferSize(line, product);
  if (!color || !size) return null;

  return {
    productId: product.printifyId,
    color: product.printifyColorMap?.[color] ?? color,
    size,
  };
}

export function getOrderShippingSnapshot(order: {
  shipFirstName: string | null;
  shipLastName: string | null;
  shipEmail: string | null;
  shipPhone: string | null;
  shipAddress1: string | null;
  shipAddress2: string | null;
  shipCity: string | null;
  shipState: string | null;
  shipPostalCode: string | null;
  shipCountry: string | null;
}): ShippingSnapshot {
  return {
    firstName: order.shipFirstName,
    lastName: order.shipLastName,
    email: order.shipEmail,
    phone: order.shipPhone,
    address1: order.shipAddress1,
    address2: order.shipAddress2,
    city: order.shipCity,
    state: order.shipState,
    postalCode: order.shipPostalCode,
    country: order.shipCountry,
  };
}

export function buildPrintifyAddress(snapshot: ShippingSnapshot): PrintifyAddress {
  const missing = [
    ['first_name', snapshot.firstName],
    ['last_name', snapshot.lastName],
    ['email', snapshot.email],
    ['address1', snapshot.address1],
    ['city', snapshot.city],
    ['zip', snapshot.postalCode],
    ['country', snapshot.country],
  ].filter(([, value]) => !value);

  if (missing.length) {
    throw new Error(`PRINTIFY_ADDRESS_INCOMPLETE:${missing.map(([key]) => key).join(',')}`);
  }

  return {
    first_name: snapshot.firstName!,
    last_name: snapshot.lastName!,
    email: snapshot.email!,
    phone: snapshot.phone ?? undefined,
    address1: snapshot.address1!,
    address2: snapshot.address2 ?? undefined,
    city: snapshot.city!,
    region: snapshot.state ?? undefined,
    zip: snapshot.postalCode!,
    country: snapshot.country!.toUpperCase(),
  };
}

export function getPrintifyReadiness(params: {
  lines: PrintifyFulfillmentLine[];
  shipping: ShippingSnapshot;
  resolvableSkus?: Set<string>;
}): PrintifyReadiness {
  const issues: string[] = [];

  if (!params.lines.length) {
    issues.push('No order items saved.');
  }

  params.lines.forEach((line, index) => {
    const hasDirectMapping = !!line.printifyProductId && typeof line.printifyVariantId === 'number';
    const hasSkuFallback = !!line.sku && (!params.resolvableSkus || params.resolvableSkus.has(line.sku));
    const hasStaticMapping = !!staticPrintifyMapping(line);
    if (!hasDirectMapping && !hasSkuFallback && !hasStaticMapping) {
      issues.push(`Item ${index + 1} is missing a Printify variant mapping and SKU fallback.`);
    }
    if (!line.qty || line.qty < 1) {
      issues.push(`Item ${index + 1} has an invalid quantity.`);
    }
  });

  const requiredShipping: Array<[string, string | null]> = [
    ['First name', params.shipping.firstName],
    ['Last name', params.shipping.lastName],
    ['Email', params.shipping.email],
    ['Address', params.shipping.address1],
    ['City', params.shipping.city],
    ['Postal code', params.shipping.postalCode],
    ['Country', params.shipping.country],
  ];

  requiredShipping.forEach(([label, value]) => {
    if (!value) issues.push(`Shipping ${label.toLowerCase()} is missing.`);
  });

  return { ok: issues.length === 0, issues };
}

export async function resolvePrintifyLineItems(lines: PrintifyFulfillmentLine[]): Promise<PrintifyOrderLineItem[]> {
  const items: PrintifyOrderLineItem[] = [];

  for (const line of lines) {
    if (line.printifyProductId && typeof line.printifyVariantId === 'number') {
      items.push({
        product_id: line.printifyProductId,
        variant_id: line.printifyVariantId,
        quantity: Math.max(1, Number(line.qty) || 1),
      });
      continue;
    }

    const variant = await prisma.productVariant.findFirst({
      where: { sku: line.sku },
      select: {
        variantId: true,
        product: { select: { printifyId: true } },
      },
    });

    if (!variant) {
      const mapped = staticPrintifyMapping(line);
      if (mapped) {
        const mappedVariant = await prisma.productVariant.findFirst({
          where: {
            product: { printifyId: mapped.productId },
            color: mapped.color,
            size: mapped.size,
          },
          select: {
            variantId: true,
            product: { select: { printifyId: true } },
          },
        });

        if (mappedVariant) {
          items.push({
            product_id: mappedVariant.product.printifyId,
            variant_id: mappedVariant.variantId,
            quantity: Math.max(1, Number(line.qty) || 1),
          });
          continue;
        }
      }

      throw new Error(`PRINTIFY_VARIANT_NOT_FOUND:${line.sku || line.title}`);
    }

    items.push({
      product_id: variant.product.printifyId,
      variant_id: variant.variantId,
      quantity: Math.max(1, Number(line.qty) || 1),
    });
  }

  return items;
}

export async function buildPrintifyOrderPayload(params: {
  orderId: string;
  lines: PrintifyFulfillmentLine[];
  shipping: ShippingSnapshot;
}): Promise<CreateOrderPayload> {
  const readiness = getPrintifyReadiness(params);
  if (!readiness.ok) {
    throw new Error(`PRINTIFY_NOT_READY:${readiness.issues.join('|')}`);
  }

  return {
    external_id: params.orderId,
    label: `Kami Kulture ${params.orderId}`,
    line_items: await resolvePrintifyLineItems(params.lines),
    shipping_method: printifyShippingMethod(),
    send_shipping_notification: process.env.PRINTIFY_SEND_SHIPPING_NOTIFICATION === '1',
    address_to: buildPrintifyAddress(params.shipping),
  };
}

export async function submitPrintifyFulfillment(params: {
  orderId: string;
  lines: PrintifyFulfillmentLine[];
  shipping: ShippingSnapshot;
}) {
  const payload = await buildPrintifyOrderPayload(params);
  const shopId = getEnvShopId();
  const created = await createPrintifyOrder(shopId, payload);
  let response = created;

  try {
    response = await getPrintifyOrder(shopId, created.id);
  } catch {
    // Creation succeeded; keep the create response if the follow-up status read is unavailable.
  }

  return { payload, response, created };
}

export async function fetchPrintifyFulfillmentOrder(printifyOrderId: string) {
  return getPrintifyOrder(getEnvShopId(), printifyOrderId);
}

export function mergeOrderRaw(raw: Prisma.JsonValue | null, patch: Record<string, Prisma.InputJsonValue>) {
  const rawObject = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, Prisma.JsonValue>
    : {};

  return {
    ...rawObject,
    ...patch,
  } as Prisma.InputJsonValue;
}
