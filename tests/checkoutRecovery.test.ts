import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePendingPayment, recoverCheckoutPayment } from '../src/lib/checkoutRecovery.ts';

const payment = { paypalOrderId: '8XE81335WE8700611', email: 'owner@example.com', createdAt: 1000 };
const wait = async () => {};

test('pending checkout survives a reload but malformed and stale storage is ignored', () => {
  assert.deepEqual(parsePendingPayment(JSON.stringify(payment), 2000), payment);
  for (const value of [null, '{bad', '{}', JSON.stringify({ ...payment, paypalOrderId: 12345678901 }), JSON.stringify({ ...payment, email: '' }), JSON.stringify({ ...payment, createdAt: 3000 })])
    assert.equal(parsePendingPayment(value, 2000), null);
  assert.equal(parsePendingPayment(JSON.stringify(payment), 86401001), null);
});

test('a lost browser response recovers from the webhook using only the read-only status API', async () => {
  let calls = 0;
  const request: typeof fetch = async (url, options) => {
    assert.equal(url, '/api/orders/payment-status');
    assert.equal(options?.method, 'POST');
    assert.deepEqual(JSON.parse(String(options?.body)), { paypalOrderId: payment.paypalOrderId, email: payment.email });
    calls++;
    if (calls === 1) throw new TypeError('Load failed');
    if (calls === 2) return Response.json({ confirmed: false });
    return Response.json({ confirmed: true, orderId: 'KK-261027-TEST' });
  };
  assert.equal(await recoverCheckoutPayment(payment, request, wait), 'KK-261027-TEST');
  assert.equal(calls, 3);
});

test('failed, pending, and malformed confirmations never become a successful receipt', async () => {
  for (const response of [Response.json({ confirmed: false }), Response.json({ confirmed: true }), Response.json({ confirmed: true, orderId: 'https://evil.test' }), Response.json({ confirmed: true, orderId: 'KK-TEST' }, { status: 503 })])
    assert.equal(await recoverCheckoutPayment(payment, async () => response.clone(), wait, 2), null);
  let calls = 0;
  assert.equal(await recoverCheckoutPayment(payment, async () => { calls++; return Response.json({ confirmed: false }, { status: 429 }); }, wait), null);
  assert.equal(calls, 1);
});
