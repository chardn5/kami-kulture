import test from 'node:test';
import assert from 'node:assert/strict';
import { captureAndReloadPayment } from '../src/lib/paypalServer';
import { verifyCompletedPayment, type PayPalPayment } from '../src/lib/checkoutSecurity';

const full: PayPalPayment = { id: 'TESTPAYPAL123', status: 'COMPLETED', purchase_units: [{ custom_id: 'KK-TEST', amount: { value: '40.34', currency_code: 'USD' }, payments: { captures: [{ id: 'TESTCAPTURE123', status: 'COMPLETED', amount: { value: '40.34', currency_code: 'USD' } }] } }] };
test('minimal PayPal capture responses are reloaded before checking order ownership and amount', async () => {
  const calls: string[] = [];
  const result = await captureAndReloadPayment('TESTPAYPAL123', { status: 'APPROVED' }, true, async (path, method = 'GET') => {
    calls.push(`${method} ${path}`);
    return method === 'POST' ? { id: 'TESTPAYPAL123', status: 'COMPLETED' } : full;
  });
  assert.equal(verifyCompletedPayment(result, { id: 'KK-TEST', total: 40.34, currency: 'USD' }), 'TESTCAPTURE123');
  assert.deepEqual(calls, ['POST /v2/checkout/orders/TESTPAYPAL123/capture', 'GET /v2/checkout/orders/TESTPAYPAL123']);
});
test('a capture timeout is reconciled with GET without a second capture attempt', async () => {
  let captures = 0, reads = 0;
  const result = await captureAndReloadPayment('TESTPAYPAL123', { status: 'APPROVED' }, true, async (_path, method) => {
    if (method === 'POST') { captures++; throw new Error('timeout'); }
    reads++; return full;
  });
  assert.equal(result, full); assert.equal(captures, 1); assert.equal(reads, 1);
});
test('completed orders and completion-only webhook events never initiate another capture', async () => {
  const request = async () => { assert.fail('No provider request expected'); };
  assert.equal(await captureAndReloadPayment('TESTPAYPAL123', full, true, request), full);
  const pending = { status: 'APPROVED' };
  assert.equal(await captureAndReloadPayment('TESTPAYPAL123', pending, false, request), pending);
});
