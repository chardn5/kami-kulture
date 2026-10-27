import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { personalOfferForCheckout, personalOfferPrice, claimPersonalOffer } from '../src/lib/personalOffer.ts';

const offer = {
  id: '11111111-1111-4111-8111-111111111111',
  codeHash: createHash('sha256').update('PRIVATE-TEST').digest('hex'),
  email: 'owner@example.com', sku: 'tee-ivory-xl',
  expiresAt: '2030-01-01T00:00:00.000Z', environment: 'live',
};
const lines = [{ sku: offer.sku, qty: 1 }];
const check = (code: unknown = 'PRIVATE-TEST', email = offer.email, cart = lines, environment = 'live', config = JSON.stringify(offer)) =>
  personalOfferForCheckout(code, email, cart, environment, config, Date.parse('2026-01-01'));

test('personal offer requires matching code, email, environment, variant and quantity', () => {
  assert.equal(check(' private-test ', 'OWNER@example.com')?.id, offer.id);
  assert.equal(check(''), null);
  assert.throws(() => check('wrong'), /PERSONAL_OFFER_INVALID/);
  assert.throws(() => check(123), /PERSONAL_OFFER_INVALID/);
  assert.throws(() => check('PRIVATE-TEST', 'other@example.com'), /PERSONAL_OFFER_EMAIL/);
  assert.throws(() => check('PRIVATE-TEST', offer.email, [{ sku: offer.sku, qty: 2 }]), /PERSONAL_OFFER_ITEM/);
  assert.throws(() => check('PRIVATE-TEST', offer.email, [{ sku: 'other', qty: 1 }]), /PERSONAL_OFFER_ITEM/);
  assert.throws(() => check('PRIVATE-TEST', offer.email, [...lines, ...lines]), /PERSONAL_OFFER_ITEM/);
  assert.throws(() => check('PRIVATE-TEST', offer.email, lines, 'sandbox'), /PERSONAL_OFFER_INVALID/);
  assert.throws(() => check('PRIVATE-TEST', offer.email, lines, 'live', '{}'), /PERSONAL_OFFER_INVALID/);
  assert.throws(() => check('PRIVATE-TEST', offer.email, lines, 'live', '{bad'), /PERSONAL_OFFER_INVALID/);
  assert.throws(() => check('PRIVATE-TEST', offer.email, lines, 'live', JSON.stringify({ ...offer, expiresAt: '2025-01-01T00:00:00.000Z' })), /PERSONAL_OFFER_EXPIRED/);
});

test('cost uses verified provider cents and never silently falls back to retail', () => {
  assert.equal(personalOfferPrice(1849, 34.99), 18.49);
  for (const cost of [undefined, null, '1849', 0, -1, 1849.5, 3500, Infinity])
    assert.throws(() => personalOfferPrice(cost, 34.99), /PERSONAL_OFFER_COST/);
});

test('a claim must be acquired before capture and uniqueness conflicts fail closed', async () => {
  await claimPersonalOffer('order', offer.id, async (id, key) => {
    assert.equal(id, 'order'); assert.equal(key, offer.id); return { count: 1 };
  });
  await assert.rejects(claimPersonalOffer('order', offer.id, async () => ({ count: 0 })), /PERSONAL_OFFER_USED/);
  await assert.rejects(claimPersonalOffer('order', offer.id, async () => { throw { code: 'P2002' }; }), /PERSONAL_OFFER_USED/);
  await assert.rejects(claimPersonalOffer('order', offer.id, async () => { throw new Error('database offline'); }), /database offline/);
});
