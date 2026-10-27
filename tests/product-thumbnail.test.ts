import test from 'node:test';
import assert from 'node:assert/strict';
import { productThumbnail } from '../src/lib/productThumbnail';

const image = (label: string, color = 'black') => `https://images-api.printify.com/mockup/product/${color}/photo/shirt.jpg?camera_label=${label}`;
const models = ['person-1-front', 'person-2', 'person-3-front', 'person-4-front', 'person-5-context'];
const images = ['front', 'back', 'folded', 'size-chart', 'person-1-back', 'person-3-left-sleeve', ...models].map(label => image(label));

test('thumbnail selection varies models across designs without changing on sorting or reload', () => {
  const selected = Array.from({ length: 40 }, (_, i) => productThumbnail(`design-${i}`, images));
  assert.equal(new Set(selected).size, models.length);
  for (let i = 0; i < selected.length; i++) {
    assert.equal(selected[i], productThumbnail(`design-${i}`, images));
    assert.equal(selected[i], productThumbnail(`design-${i}`, [...images].reverse()));
    assert.ok(models.some(label => selected[i] === image(label)));
  }
});

test('model groups receive equal weight regardless of extra colors or poses', () => {
  const expanded = [...images, image('person-1-front', 'ivory'), image('person-1-context'), image('person-1-context-2')];
  for (let i = 0; i < 40; i++) {
    const before = new URL(productThumbnail(`design-${i}`, images)).searchParams.get('camera_label')!;
    const after = new URL(productThumbnail(`design-${i}`, expanded)).searchParams.get('camera_label')!;
    assert.equal(before.split('-')[1], after.split('-')[1]);
    assert.ok(!after.includes('context') || after.startsWith('person-5-'));
  }
});

test('thumbnail selection preserves gallery order, stays within the product, and handles missing models', () => {
  const original = [...images];
  const selected = productThumbnail('shirt', images);
  assert.ok(images.includes(selected));
  assert.deepEqual(images, original);
  assert.equal(productThumbnail('legacy', ['/curated-model.png', '/back.png']), '/curated-model.png');
  assert.equal(productThumbnail('flat', [image('front'), image('back')]), image('front'));
  assert.equal(productThumbnail('missing', []), '/logo.png');
});
