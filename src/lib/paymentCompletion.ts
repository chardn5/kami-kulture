import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { captureAndReloadPayment, paypalEnvironment, paypalRequest } from '@/lib/paypalServer';
import { verifyCompletedPayment } from '@/lib/checkoutSecurity';
import { sendOrderReceipt, notifyAdminNewOrder } from '@/lib/email';
import { getOrderShippingSnapshot, isPrintifyAutoSubmitEnabled, submitPrintifyFulfillment } from '@/lib/printifyFulfillment';
import { hasPaymentTestItem } from '@/lib/paymentTest';

export async function completePayPalOrder(paypalOrderId: string, allowCapture = true) {
  let payment = await paypalRequest(`/v2/checkout/orders/${paypalOrderId}`);
  const unit = payment.purchase_units?.[0];
  if (!unit?.custom_id) throw new Error('ORDER_SNAPSHOT_REQUIRED');
  const pending = await prisma.order.findUnique({ where: { id: unit.custom_id } });
  if (!pending) throw new Error('ORDER_NOT_FOUND');
  const raw = pending.raw as Record<string, Prisma.JsonValue> | null;
  const checkout = raw?.checkout as Record<string, Prisma.JsonValue> | undefined;
  if (!checkout || checkout.environment !== paypalEnvironment()) throw new Error('ORDER_ENVIRONMENT_MISMATCH');
  if (pending.paypalOrderId && pending.paypalOrderId !== paypalOrderId) throw new Error('PAYPAL_ORDER_MISMATCH');
  const total = pending.amountTotal.toNumber();
  if (payment.id !== paypalOrderId || payment.purchase_units?.length !== 1 ||
    unit.amount?.currency_code !== pending.currency || !Number.isFinite(Number(unit.amount?.value)) ||
    Math.round(Number(unit.amount?.value) * 100) !== Math.round(total * 100)) throw new Error('PAYMENT_AMOUNT_MISMATCH');
  payment = await captureAndReloadPayment(paypalOrderId, payment, allowCapture && pending.status === 'PENDING_PAYMENT');
  const captureId = verifyCompletedPayment(payment, { id: pending.id, currency: pending.currency, total });
  if (pending.captureId && pending.captureId !== captureId) throw new Error('CAPTURE_MISMATCH');
  // Payment persistence is independent of email and fulfillment, which can be retried safely.
  await prisma.order.updateMany({ where: { id: pending.id, status: 'PENDING_PAYMENT', captureId: null }, data: {
    status: 'PAID', captureId, paypalOrderId, paidAt: new Date(),
    payerEmail: pending.shipEmail ?? pending.buyerEmail,
    payerName: [pending.shipFirstName, pending.shipLastName].filter(Boolean).join(' '),
    raw: { ...raw, raw: payment as unknown as Prisma.InputJsonValue },
  } });
  const confirmed = await prisma.order.findUniqueOrThrow({ where: { id: pending.id } });
  if (confirmed.captureId !== captureId) throw new Error('CAPTURE_MISMATCH');
  try { await processPaymentEffects(pending.id); }
  catch { console.warn('[payment] notification queued for retry', pending.id); }
  return { orderId: pending.id };
}

export async function processPaymentEffects(orderId: string) {
  const token = randomUUID();
  const claimed = await prisma.order.updateMany({ where: {
    id: orderId, paidAt: { not: null }, captureId: { not: null }, paymentEffectsCompletedAt: null,
    OR: [{ paymentProcessingUntil: null }, { paymentProcessingUntil: { lt: new Date() } }],
  }, data: { paymentProcessingUntil: new Date(Date.now() + 5 * 60_000), paymentProcessingToken: token } });
  if (!claimed.count) return;
  try {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    // Never retry an ambiguous Printify create automatically; a human must reconcile it.
    if (!hasPaymentTestItem(order.items) && isPrintifyAutoSubmitEnabled() && order.status === 'PAID' && !order.printifyOrderId && !order.printifyLastError) {
      await prisma.order.update({ where: { id: orderId }, data: { printifyLastError: 'Submission started; confirm in Printify before retrying if interrupted.' } });
      try {
        const result = await submitPrintifyFulfillment({ orderId, shipping: getOrderShippingSnapshot(order),
          lines: order.items.map(i => ({ ...i, size: i.size ?? undefined, color: i.color ?? undefined })) });
        await prisma.order.update({ where: { id: orderId }, data: {
          status: 'FULFILLMENT_SUBMITTED', printifyOrderId: result.response.id,
          printifyStatus: result.response.status ?? 'submitted', printifySubmittedAt: new Date(), printifyLastError: null,
          printifyPayload: result.payload as Prisma.InputJsonValue,
        } });
      } catch {
        await prisma.order.update({ where: { id: orderId }, data: { status: 'FULFILLMENT_FAILED', printifyLastError: 'Submission could not be confirmed. Check Printify before retrying.' } });
      }
    }
    const email = order.shipEmail ?? order.buyerEmail ?? order.payerEmail;
    const customerName = [order.shipFirstName, order.shipLastName].filter(Boolean).join(' ') || order.payerName || undefined;
    const items = order.items.map(i => ({ title: i.title, qty: i.qty, unitPrice: i.unitPrice.toNumber(),
      sku: i.sku, size: i.size ?? undefined, color: i.color ?? undefined, image: i.image ?? undefined }));
    const amounts = { subtotal: order.amountSubtotal?.toNumber() ?? 0, shipping: order.amountShipping?.toNumber() ?? 0,
      tax: order.amountTax?.toNumber(), total: order.amountTotal.toNumber(), currency: order.currency };
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.kamikulture.com';
    if (!order.receiptSentAt && email) {
      const result = await sendOrderReceipt({ to: email, orderNumber: orderId, customerName, items, ...amounts,
        trackUrl: `${site}/track-order?orderID=${encodeURIComponent(orderId)}&email=${encodeURIComponent(email)}`,
        idempotencyKey: `receipt-${orderId}` });
      if (!result.ok || result.id === 'dev-noop') throw new Error('RECEIPT_DELIVERY_FAILED');
      await prisma.order.update({ where: { id: orderId }, data: { receiptSentAt: new Date() } });
    }
    if (!order.adminNotificationSentAt) {
      const result = await notifyAdminNewOrder({ orderNumber: orderId, customerEmail: email ?? undefined, customerName,
        items, ...amounts, fulfillmentStatus: 'Review in admin', adminUrl: `${site}/admin/orders/${encodeURIComponent(orderId)}`,
        idempotencyKey: `admin-order-${orderId}` });
      if (!result.ok || result.id === 'dev-noop') throw new Error('ADMIN_EMAIL_DELIVERY_FAILED');
      await prisma.order.update({ where: { id: orderId }, data: { adminNotificationSentAt: new Date() } });
    }
    await prisma.order.update({ where: { id: orderId }, data: { paymentEffectsCompletedAt: new Date(), paymentLastError: null } });
  } catch (error) {
    await prisma.order.update({ where: { id: orderId }, data: { paymentLastError: error instanceof Error ? error.message.slice(0, 200) : 'PAYMENT_PROCESSING_FAILED' } });
    throw error;
  } finally {
    await prisma.order.updateMany({ where: { id: orderId, paymentProcessingToken: token }, data: { paymentProcessingUntil: null, paymentProcessingToken: null } });
  }
}

export async function retryPaymentEffects() {
  const orders = await prisma.order.findMany({ where: { paidAt: { not: null }, captureId: { not: null }, paymentEffectsCompletedAt: null }, take: 10, orderBy: { paidAt: 'asc' }, select: { id: true } });
  let failed = 0;
  for (const order of orders) { try { await processPaymentEffects(order.id); } catch { failed++; } }
  return { checked: orders.length, failed };
}
