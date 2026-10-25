import { NextRequest, NextResponse } from 'next/server';
import { paypalEnvironment, paypalRequest } from '@/lib/paypalServer';
import { paypalEventSchema, processPayPalEvent, webhookVerificationPayload } from '@/lib/paypalWebhook';
import { completePayPalOrder } from '@/lib/paymentCompletion';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 });
  if (Number(req.headers.get('content-length') ?? 0) > 256_000) return new NextResponse('Request too large', { status: 413 });
  const text = await req.text();
  if (text.length > 256_000) return new NextResponse('Request too large', { status: 413 });
  let event: unknown;
  let verification: ReturnType<typeof webhookVerificationPayload>;
  try { event = JSON.parse(text); verification = webhookVerificationPayload(req.headers, event, webhookId); }
  catch { return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 }); }
  try {
    const result = await paypalRequest<{ verification_status: string }>('/v1/notifications/verify-webhook-signature', 'POST', verification);
    if (result.verification_status !== 'SUCCESS') return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    const parsed = paypalEventSchema.safeParse(event);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    await processPayPalEvent(parsed.data, paypalEnvironment(), {
      complete: completePayPalOrder,
      store: {
        getStatus: async id => (await prisma.paymentEvent.findUnique({ where: { id }, select: { status: true } }))?.status ?? null,
        received: async (id, data, paypalOrderId) => { await prisma.paymentEvent.upsert({ where: { id },
          create: { id, type: data.event_type, environment: paypalEnvironment(), paypalOrderId, attempts: 1 },
          update: { attempts: { increment: 1 }, lastError: null } }); },
        completed: async (id, status, orderId) => { await prisma.paymentEvent.update({ where: { id }, data: { status, orderId, processedAt: new Date(), lastError: null } }); },
        failed: async id => { await prisma.paymentEvent.update({ where: { id }, data: { status: 'FAILED', lastError: 'Processing failed; PayPal delivery retry required.' } }); },
      },
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[paypal] webhook processing failed', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Please retry delivery' }, { status: 500 });
  }
}
