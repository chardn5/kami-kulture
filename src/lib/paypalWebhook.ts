import { z } from 'zod';

export const paypalEventSchema = z.object({
  id: z.string().min(1).max(100),
  event_type: z.string().min(1).max(100),
  resource: z.object({
    id: z.string().optional(),
    supplementary_data: z.object({ related_ids: z.object({ order_id: z.string().optional(), capture_id: z.string().optional() }).optional() }).optional(),
  }).passthrough(),
}).passthrough();
export type PayPalEvent = z.infer<typeof paypalEventSchema>;

export function webhookOrderId(event: PayPalEvent) {
  const id = event.event_type === 'CHECKOUT.ORDER.APPROVED' ? event.resource.id : event.resource.supplementary_data?.related_ids?.order_id;
  return id && /^[A-Z0-9]{10,32}$/.test(id) ? id : null;
}

export function webhookVerificationPayload(headers: Headers, event: unknown, webhookId: string) {
  const read = (name: string) => {
    const value = headers.get(name);
    if (!value || value.length > 4096) throw new Error('INVALID_WEBHOOK_HEADERS');
    return value;
  };
  const certUrl = read('paypal-cert-url');
  const url = new URL(certUrl);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.paypal.com') || url.username || url.password) throw new Error('INVALID_WEBHOOK_CERTIFICATE');
  return { auth_algo: read('paypal-auth-algo'), cert_url: certUrl,
    transmission_id: read('paypal-transmission-id'), transmission_sig: read('paypal-transmission-sig'),
    transmission_time: read('paypal-transmission-time'), webhook_id: webhookId, webhook_event: event };
}

type EventStore = {
  getStatus: (id: string) => Promise<string | null>;
  received: (id: string, event: PayPalEvent, paypalOrderId: string | null) => Promise<void>;
  completed: (id: string, status: string, orderId?: string) => Promise<void>;
  failed: (id: string) => Promise<void>;
};

export async function processPayPalEvent(event: PayPalEvent, environment: string, deps: {
  store: EventStore;
  complete: (id: string, allowCapture: boolean) => Promise<{ orderId: string }>;
}) {
  const key = `${environment}:${event.id}`;
  if (await deps.store.getStatus(key) === 'PROCESSED') return { duplicate: true };
  const paypalOrderId = webhookOrderId(event);
  await deps.store.received(key, event, paypalOrderId);
  try {
    if (['CHECKOUT.ORDER.APPROVED', 'PAYMENT.CAPTURE.COMPLETED'].includes(event.event_type)) {
      if (!paypalOrderId) throw new Error('WEBHOOK_ORDER_ID_MISSING');
      const result = await deps.complete(paypalOrderId, event.event_type === 'CHECKOUT.ORDER.APPROVED');
      await deps.store.completed(key, 'PROCESSED', result.orderId);
    } else {
      const needsReview = ['PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED', 'PAYMENT.CAPTURE.DENIED'].includes(event.event_type);
      await deps.store.completed(key, needsReview ? 'REVIEW' : 'IGNORED');
    }
    return { duplicate: false };
  } catch (error) { await deps.store.failed(key); throw error; }
}
