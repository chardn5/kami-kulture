import test from 'node:test';
import assert from 'node:assert/strict';
import { approvedTags, designSlug, isApprovedDesign, isSameOriginMutation } from '../src/lib/designMetadata.ts';
import { mapManagedProduct } from '../src/lib/catalog.ts';
import { getGarment } from '../src/data/garments.ts';

test('managed products require both approval and website visibility', () => {
  for (const tags of [[], ['kami:managed'], ['kami:approved']]) assert.equal(isApprovedDesign({ visible: true, tags }), false);
  const tags = approvedTags(['kami:managed', 'tee'], true);
  assert.equal(isApprovedDesign({ visible: true, tags }), true);
  assert.equal(isApprovedDesign({ visible: false, tags }), false);
  assert.equal(isApprovedDesign({ visible: true, tags: approvedTags(tags, false) }), false);
  assert.deepEqual(approvedTags([...tags, 'kami:approved'], true), tags);
});

test('design slugs and cross-origin mutations are validated', () => {
  assert.equal(designSlug(['kami:slug:training-arc-mode']), 'training-arc-mode');
  for (const value of ['../admin', '', 'a'.repeat(71), 'shirt--one', 'Shirt']) assert.equal(designSlug([`kami:slug:${value}`]), null);
  assert.equal(isSameOriginMutation('https://evil.example', 'https://www.kamikulture.com/api'), false);
  assert.equal(isSameOriginMutation('https://www.kamikulture.com', 'https://www.kamikulture.com/api'), true);
  assert.equal(isSameOriginMutation(null, 'https://www.kamikulture.com/api'), true);
});

test('catalog maps approved designs to real provider IDs, color images, and stable checkout SKUs', () => {
  const now = new Date();
  const product = {
    id: 'db-1', printifyId: 'remote-1', title: 'Training Arc', slug: 'training-arc', description: '', visible: true,
    tags: ['kami:managed', 'kami:approved', 'kami:garment:comfort-colors-1717', 'tee'], priceMinCents: 3000, priceMaxCents: 3000,
    currency: 'USD', optionsJson: null, createdAt: now, updatedAt: now, srcCreatedAt: null, srcUpdatedAt: null,
    variants: [{ id: 'v1', productId: 'db-1', variantId: 78961, title: 'Graphite / S', sku: 'provider-sku', optionIndexes: [],
      color: 'Graphite', size: 'S', priceCents: 3000, isEnabled: true, isAvailable: true, grams: null, createdAt: now, updatedAt: now }],
    images: [{ id: 'i1', productId: 'db-1', url: 'https://example.com/graphite.jpg', position: 0, variantIds: [78961], createdAt: now }],
  };
  const mapped = mapManagedProduct(product);
  assert.equal(mapped.price, 30);
  assert.deepEqual(mapped.tags, ['tee']);
  assert.equal(mapped.variants?.[0].sku, 'training-arc-graphite-s');
  assert.equal(mapped.variants?.[0].variantId, 78961);
  assert.equal(mapped.variants?.[0].printifyProductId, 'remote-1');
  assert.deepEqual(mapped.variants?.[0].images, ['https://example.com/graphite.jpg']);
  assert.equal(mapManagedProduct({ ...product, visible: false }).variants?.[0].isAvailable, false);
  assert.equal(mapManagedProduct({ ...product, tags: ['kami:managed'] }).variants?.[0].isAvailable, false);
  assert.equal(getGarment(mapped.slug, mapped.garmentKey)?.name, 'Comfort Colors 1717');
});
