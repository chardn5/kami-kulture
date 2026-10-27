export type PendingCheckoutPayment = { paypalOrderId: string; email: string; createdAt: number };
export const PENDING_PAYMENT_KEY = 'kami-pending-payment';
export const CONFIRMED_PAYMENT_KEY = 'kami-confirmed-checkout';

export function parsePendingPayment(value: string | null, now = Date.now()): PendingCheckoutPayment | null {
  try {
    const payment = JSON.parse(value ?? 'null');
    if (!payment || typeof payment.paypalOrderId !== 'string' || !/^[A-Z0-9]{10,32}$/.test(payment.paypalOrderId) ||
      typeof payment.email !== 'string' || payment.email.length > 254 || !payment.email.includes('@') ||
      !Number.isFinite(payment.createdAt) || payment.createdAt > now || now - payment.createdAt > 86400000) return null;
    return payment;
  } catch { return null; }
}

export async function recoverCheckoutPayment(
  payment: PendingCheckoutPayment,
  request: typeof fetch = fetch,
  wait: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms)),
  attempts = 12,
): Promise<string | null> {
  // Recovery only reads our saved payment; it never captures or creates a PayPal order.
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt) await wait(2000);
    try {
      const response = await request('/api/orders/payment-status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paypalOrderId: payment.paypalOrderId, email: payment.email }),
        cache: 'no-store', signal: AbortSignal.timeout(8000),
      });
      const result = await response.json();
      if (response.ok && result.confirmed === true && typeof result.orderId === 'string' && /^KK-[A-Z0-9-]+$/.test(result.orderId)) return result.orderId;
      if ([400, 404, 429].includes(response.status)) return null;
    } catch { /* A disconnected browser can recover on the next check or page load. */ }
  }
  return null;
}
