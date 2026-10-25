import test from 'node:test';
import assert from 'node:assert/strict';
import { safeAdminNext, validAdminCredentials } from '../src/lib/adminLogin';
import { createAdminSessionToken, verifyAdminSessionToken } from '../src/lib/adminSession';
import { retailPriceCents, refreshCartRetailPrices } from '../src/lib/retailPricing';
import { estimatePaymentFee } from '../src/lib/pricing';
import { paypalEventSchema, processPayPalEvent, webhookOrderId, webhookVerificationPayload, type PayPalEvent } from '../src/lib/paypalWebhook';
import { isSameOriginRequest } from '../src/lib/requestOrigin';

test('admin mutations validate the public Host and protocol behind a Next.js proxy', () => {
  const request = { url: 'http://localhost:3001/api/admin/session', headers: new Headers({ host: '127.0.0.1:3001', origin: 'http://127.0.0.1:3001', 'x-forwarded-proto': 'http' }) };
  assert.equal(isSameOriginRequest(request), true);
  request.headers.set('origin', 'https://evil.example'); assert.equal(isSameOriginRequest(request), false);
  request.headers.set('host', 'www.kamikulture.com'); request.headers.set('origin', 'https://www.kamikulture.com'); request.headers.set('x-forwarded-proto', 'https');
  assert.equal(isSameOriginRequest(request), true);
});

test('admin login validates complete passwords, expires sessions, and blocks redirect escapes', () => {
  const oldUser = process.env.BASIC_AUTH_USER, oldPass = process.env.BASIC_AUTH_PASS;
  process.env.BASIC_AUTH_USER = 'admin-test'; process.env.BASIC_AUTH_PASS = 'test:password:with:colons';
  try {
    assert.equal(validAdminCredentials('admin-test', 'test:password:with:colons'), true);
    assert.equal(validAdminCredentials('admin-test', 'wrong'), false);
    const token = createAdminSessionToken(1000);
    assert.equal(verifyAdminSessionToken(token, 2000), true);
    assert.equal(verifyAdminSessionToken(`${token}x`, 2000), false);
    assert.equal(verifyAdminSessionToken(token, 3601001), false);
    for (const next of ['https://evil.com', '//evil.com', '/admin\\evil', '/admin/sign-in', '/administrator', '/admin/\r\n']) assert.equal(safeAdminNext(next), '/admin');
    assert.equal(safeAdminNext('/admin/orders?q=KK-TEST'), '/admin/orders?q=KK-TEST');
  } finally {
    if (oldUser === undefined) delete process.env.BASIC_AUTH_USER; else process.env.BASIC_AUTH_USER = oldUser;
    if (oldPass === undefined) delete process.env.BASIC_AUTH_PASS; else process.env.BASIC_AUTH_PASS = oldPass;
  }
});

test('retail pricing has approved size tiers and rejects unknown sizes', () => {
  assert.equal(retailPriceCents('S'), 3499); assert.equal(retailPriceCents('XL'), 3499);
  assert.equal(retailPriceCents('2XL'), 3699); assert.equal(retailPriceCents('3XL'), 3999);
  assert.equal(retailPriceCents('4XL'), 4499); assert.equal(retailPriceCents('5XL'), 4499);
  assert.throws(() => retailPriceCents('mystery'));
  assert.equal(estimatePaymentFee(30), 1.62);
  const saved = [{ size: '4XL', price: 30, qty: 2 }];
  assert.deepEqual(refreshCartRetailPrices(saved), [{ size: '4XL', price: 44.99, qty: 2 }]);
  assert.equal(saved[0].price, 30);
});

const event: PayPalEvent = { id: 'WH-TEST', event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'CAPTURE123456', supplementary_data: { related_ids: { order_id: 'PAYPAL1234567' } } } };
test('webhook payload needs PayPal headers and a PayPal HTTPS certificate', () => {
  assert.equal(paypalEventSchema.safeParse({ id: 'bad' }).success, false);
  assert.equal(webhookOrderId(event), 'PAYPAL1234567');
  assert.equal(webhookOrderId({ ...event, resource: {} }), null);
  assert.equal(webhookOrderId({ ...event, event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: 'APPROVED12345' } }), 'APPROVED12345');
  const headers = new Headers({ 'paypal-cert-url': 'https://api.paypal.com/v1/notifications/certs/test', 'paypal-auth-algo': 'SHA256withRSA', 'paypal-transmission-id': 'id', 'paypal-transmission-sig': 'signature', 'paypal-transmission-time': '2026-10-25T01:00:00Z' });
  assert.equal(webhookVerificationPayload(headers, event, 'HOOK-ID').webhook_id, 'HOOK-ID');
  for (const url of ['http://api.paypal.com/cert', 'https://api.paypal.com.evil.com/cert', 'https://evil.com/cert']) { headers.set('paypal-cert-url', url); assert.throws(() => webhookVerificationPayload(headers, event, 'HOOK-ID')); }
  assert.throws(() => webhookVerificationPayload(new Headers(), event, 'HOOK-ID'));
});

test('webhook retries recover failures; sequential duplicates do not recapture or rerun completion', async () => {
  const status = new Map<string, string>(); let calls = 0, fail = true;
  const deps = { store: {
    getStatus: async (id: string) => status.get(id) ?? null,
    received: async (id: string) => { status.set(id, 'RECEIVED'); },
    completed: async (id: string, value: string) => { status.set(id, value); },
    failed: async (id: string) => { status.set(id, 'FAILED'); },
  }, complete: async (_id: string, allowCapture: boolean) => { calls++; assert.equal(allowCapture, false); if (fail) throw new Error('temporary'); return { orderId: 'KK-TEST' }; } };
  await assert.rejects(processPayPalEvent(event, 'sandbox', deps));
  assert.equal(status.get('sandbox:WH-TEST'), 'FAILED');
  fail = false; await processPayPalEvent(event, 'sandbox', deps);
  assert.equal((await processPayPalEvent(event, 'sandbox', deps)).duplicate, true);
  assert.equal(calls, 2);
  await processPayPalEvent({ ...event, id: 'REFUND', event_type: 'PAYMENT.CAPTURE.REFUNDED' }, 'sandbox', deps);
  assert.equal(status.get('sandbox:REFUND'), 'REVIEW'); assert.equal(calls, 2);
});
