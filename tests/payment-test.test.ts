import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCheckoutQuote } from '../src/lib/checkout';
import { PAYMENT_TEST_SKU } from '../src/lib/paymentTest';
import { getPrintifyReadiness, resolvePrintifyLineItems } from '../src/lib/printifyFulfillment';

const customer = { email: 'buyer@example.com', firstName: 'Test', lastName: 'Buyer' };
const cart = [{ sku: PAYMENT_TEST_SKU, qty: 1 }];
const forbidden = async (): Promise<never> => { throw new Error('Test items must not call the catalog or Printify'); };
const deps = { getCatalogProducts: forbidden, getProduct: forbidden, calculateShipping: forbidden, getEnvShopId: (): never => { throw new Error('No Printify shop required'); } };

test('live verification is exactly $1, needs no address, and never calls Printify', async () => {
  const previous = process.env.PAYMENT_TEST_ENABLED;
  process.env.PAYMENT_TEST_ENABLED = 'true';
  try {
    const q = await buildCheckoutQuote({ customer, cart: [{ ...cart[0], price: 0.01, printifyProductId: 'forged' }] }, deps);
    assert.equal(q.total, 1); assert.equal(q.subtotal, 1); assert.equal(q.shipping, 0); assert.equal(q.tax, 0);
    assert.equal(q.items[0].qty, 1); assert.equal(q.items[0].printifyProductId, ''); assert.match(q.id, /^KK-TEST-/);
    for (const lines of [[...cart, { sku: 'real-shirt', qty: 1 }], [{ ...cart[0], qty: 2 }], [...cart, ...cart]]) {
      await assert.rejects(buildCheckoutQuote({ customer, cart: lines }, deps), /PAYMENT_TEST_CART/);
    }
    await assert.rejects(buildCheckoutQuote({ customer: { ...customer, email: 'invalid' }, cart }, deps));
    process.env.PAYMENT_TEST_ENABLED = 'false';
    await assert.rejects(buildCheckoutQuote({ customer, cart }, deps), /PAYMENT_TEST_DISABLED/);
  } finally {
    if (previous === undefined) delete process.env.PAYMENT_TEST_ENABLED;
    else process.env.PAYMENT_TEST_ENABLED = previous;
  }
});

test('verification items cannot be fulfilled even with a forged valid mapping or mixed items', async () => {
  const line = { sku: PAYMENT_TEST_SKU, title: 'Test', qty: 1, printifyProductId: 'real-product', printifyVariantId: 123 };
  const shipping = { firstName: 'Test', lastName: 'Buyer', email: 'buyer@example.com', phone: null, address1: '123 Main', address2: null, city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' };
  for (const lines of [[line], [{ ...line, sku: 'real-shirt' }, line]]) {
    assert.deepEqual(getPrintifyReadiness({ lines, shipping }), { ok: false, issues: ['Payment verification only. Never send this order to Printify.'] });
    await assert.rejects(resolvePrintifyLineItems(lines), /PAYMENT_TEST_NO_FULFILLMENT/);
  }
});
