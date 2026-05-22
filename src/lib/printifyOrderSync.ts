import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { fetchPrintifyFulfillmentOrder, mergeOrderRaw } from '@/lib/printifyFulfillment';
import { estimateProfit } from '@/lib/pricing';
import { sendOrderStatusEmail, type StatusEmailItem } from '@/lib/email';
import type { PrintifyOrder } from '@/lib/printify';

export const PRINTIFY_SYNC_ORDER_SELECT = {
  seq: true,
  id: true,
  status: true,
  currency: true,
  amountTotal: true,
  printifyOrderId: true,
  printifyStatus: true,
  raw: true,
  payerEmail: true,
  buyerEmail: true,
  payerName: true,
  shipEmail: true,
  shipFirstName: true,
  shipLastName: true,
  statusEmailLastStatus: true,
  items: {
    select: {
      title: true,
      qty: true,
      unitPrice: true,
      size: true,
      color: true,
      sku: true,
    },
  },
} satisfies Prisma.OrderSelect;

export type PrintifySyncOrder = Prisma.OrderGetPayload<{ select: typeof PRINTIFY_SYNC_ORDER_SELECT }>;

function centsToMoney(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return new Prisma.Decimal((value / 100).toFixed(2));
}

function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parsePrintifyDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function firstProductionDate(printifyOrder: PrintifyOrder) {
  return (
    parsePrintifyDate(printifyOrder.sent_to_production_at) ??
    parsePrintifyDate(printifyOrder.line_items?.find((item) => item.sent_to_production_at)?.sent_to_production_at)
  );
}

function firstFulfilledDate(printifyOrder: PrintifyOrder) {
  return (
    parsePrintifyDate(printifyOrder.fulfilled_at) ??
    parsePrintifyDate(printifyOrder.line_items?.find((item) => item.fulfilled_at)?.fulfilled_at)
  );
}

function firstShipment(printifyOrder: PrintifyOrder) {
  return printifyOrder.shipments?.find((shipment) => shipment.number || shipment.url || shipment.carrier) ?? null;
}

function firstShipmentDeliveredAt(printifyOrder: PrintifyOrder) {
  return parsePrintifyDate(printifyOrder.shipments?.find((shipment) => shipment.delivered_at)?.delivered_at);
}

export function orderStatusForPrintifyStatus(printifyStatus: string | null | undefined, currentStatus: string) {
  const normalized = (printifyStatus ?? '').toLowerCase();
  if (!normalized) return currentStatus;

  if (normalized.includes('delivered')) return 'DELIVERED';

  if (
    normalized.includes('shipped') ||
    normalized.includes('fulfilled') ||
    normalized.includes('ready-to-ship') ||
    normalized.includes('on-the-way') ||
    normalized.includes('available-for-pickup') ||
    normalized.includes('out-for-delivery') ||
    normalized.includes('delivery-attempt') ||
    normalized.includes('shipping-issue') ||
    normalized.includes('return-to-sender')
  ) {
    return 'SHIPPED';
  }

  if (normalized.includes('in-production') || normalized.includes('sending-to-production')) {
    return 'IN_PRODUCTION';
  }

  if (
    normalized.includes('canceled') ||
    normalized.includes('cancelled') ||
    normalized.includes('has-issues') ||
    normalized.includes('payment-not-received') ||
    normalized.includes('action-required')
  ) {
    return 'FULFILLMENT_FAILED';
  }

  if (normalized.includes('on-hold') || normalized.includes('pending') || normalized.includes('submit-order')) {
    return 'FULFILLMENT_SUBMITTED';
  }

  return currentStatus;
}

function shouldSendCustomerStatusEmail(nextStatus: string, previousEmailStatus: string | null) {
  if (previousEmailStatus === nextStatus) return false;
  return ['IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'FULFILLMENT_FAILED'].includes(nextStatus);
}

function orderCustomerEmail(order: Pick<PrintifySyncOrder, 'shipEmail' | 'payerEmail' | 'buyerEmail'>) {
  return order.shipEmail ?? order.payerEmail ?? order.buyerEmail ?? null;
}

function orderCustomerName(order: Pick<PrintifySyncOrder, 'shipFirstName' | 'shipLastName' | 'payerName'>) {
  return [order.shipFirstName, order.shipLastName].filter(Boolean).join(' ') || order.payerName || undefined;
}

function statusEmailItems(order: PrintifySyncOrder): StatusEmailItem[] {
  return order.items.map((item) => ({
    title: item.title,
    qty: item.qty,
    unitPrice: decimalToNumber(item.unitPrice),
    size: item.size ?? undefined,
    color: item.color ?? undefined,
    sku: item.sku,
  }));
}

export async function refreshOrderFromPrintify(order: PrintifySyncOrder) {
  if (!order.printifyOrderId) {
    return { ok: false, orderId: order.id, error: 'Missing Printify order ID' };
  }

  const printifyOrder = await fetchPrintifyFulfillmentOrder(order.printifyOrderId);
  const shipment = firstShipment(printifyOrder);
  const printifyCostSubtotal = centsToMoney(printifyOrder.total_price);
  const printifyCostShipping = centsToMoney(printifyOrder.total_shipping);
  const printifyCostTax = centsToMoney(printifyOrder.total_tax);
  const printifyCostTotal = centsToMoney(
    (printifyOrder.total_price ?? 0) + (printifyOrder.total_shipping ?? 0) + (printifyOrder.total_tax ?? 0)
  );
  const customerTotal = decimalToNumber(order.amountTotal);
  const estimates = printifyCostTotal
    ? estimateProfit({
        customerTotal,
        printifyCostTotal: printifyCostTotal.toNumber(),
        currency: order.currency,
      })
    : null;
  const productionDate = firstProductionDate(printifyOrder);
  const fulfilledDate = firstFulfilledDate(printifyOrder);
  const deliveredDate = firstShipmentDeliveredAt(printifyOrder);
  const nextStatus = deliveredDate ? 'DELIVERED' : orderStatusForPrintifyStatus(printifyOrder.status, order.status);

  const updated = await prisma.order.update({
    where: { seq: order.seq },
    data: {
      status: nextStatus,
      printifyStatus: printifyOrder.status ?? order.printifyStatus,
      printifyLastError: null,
      printifyCostSubtotal,
      printifyCostShipping,
      printifyCostTax,
      printifyCostTotal,
      estimatedPaymentFee: estimates ? new Prisma.Decimal(estimates.estimatedPaymentFee.toFixed(2)) : null,
      estimatedProfit: estimates ? new Prisma.Decimal(estimates.estimatedProfit.toFixed(2)) : null,
      trackingCarrier: shipment?.carrier ?? null,
      trackingNumber: shipment?.number ?? null,
      trackingUrl: shipment?.url ?? null,
      shippedAt: shipment ? (fulfilledDate ?? new Date()) : (nextStatus === 'SHIPPED' ? fulfilledDate : null),
      deliveredAt: deliveredDate,
      fulfilledAt: deliveredDate ?? fulfilledDate ?? (nextStatus === 'SHIPPED' ? new Date() : null),
      raw: mergeOrderRaw(order.raw, {
        printify: printifyOrder as Prisma.InputJsonValue,
      }),
    },
    select: {
      id: true,
      status: true,
      printifyOrderId: true,
      printifyStatus: true,
      printifySubmittedAt: true,
      printifyCostTotal: true,
      estimatedProfit: true,
      trackingCarrier: true,
      trackingNumber: true,
      trackingUrl: true,
      shippedAt: true,
      deliveredAt: true,
    },
  });

  let emailSent = false;
  const email = orderCustomerEmail(order);
  if (email && shouldSendCustomerStatusEmail(nextStatus, order.statusEmailLastStatus)) {
    const result = await sendOrderStatusEmail({
      to: email,
      orderNumber: order.id,
      status: nextStatus,
      printifyStatus: printifyOrder.status,
      customerName: orderCustomerName(order),
      currency: order.currency,
      items: statusEmailItems(order),
      trackingCarrier: shipment?.carrier,
      trackingNumber: shipment?.number,
      trackingUrl: shipment?.url,
      trackUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kamikulture.com'}/track-order?orderID=${order.id}&email=${encodeURIComponent(email)}`,
      productionDate: productionDate?.toISOString(),
      shippedAt: updated.shippedAt?.toISOString(),
      deliveredAt: updated.deliveredAt?.toISOString(),
    });

    if (result.ok) {
      emailSent = true;
      await prisma.order.update({
        where: { seq: order.seq },
        data: {
          statusEmailLastStatus: nextStatus,
          statusEmailSentAt: new Date(),
        },
      });
    }
  }

  return {
    ok: true,
    orderId: order.id,
    printifyOrderId: order.printifyOrderId,
    previousStatus: order.status,
    status: updated.status,
    printifyStatus: updated.printifyStatus,
    trackingNumber: updated.trackingNumber,
    trackingUrl: updated.trackingUrl,
    estimatedProfit: updated.estimatedProfit?.toString() ?? null,
    emailSent,
  };
}

export async function syncOpenPrintifyOrders(limit = 50) {
  const orders = await prisma.order.findMany({
    where: {
      printifyOrderId: { not: null },
      status: { notIn: ['DELIVERED', 'CANCELED', 'REFUNDED'] },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, Math.min(100, limit)),
    select: PRINTIFY_SYNC_ORDER_SELECT,
  });

  const results = [];
  for (const order of orders) {
    try {
      results.push(await refreshOrderFromPrintify(order));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PRINTIFY_SYNC_FAILED';
      await prisma.order.update({
        where: { seq: order.seq },
        data: {
          printifyLastError: message,
          raw: mergeOrderRaw(order.raw, {
            printifySyncError: message,
          }),
        },
      });
      results.push({ ok: false, orderId: order.id, printifyOrderId: order.printifyOrderId, error: message });
    }
  }

  return {
    ok: true,
    checked: orders.length,
    updated: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  };
}
