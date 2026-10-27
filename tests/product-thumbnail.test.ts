import test from 'node:test';
import assert from 'node:assert/strict';
import { productThumbnail } from '../src/lib/productThumbnail';

const image = (label: string, color = 'black') => `https://images-api.printify.com/mockup/product/${color}/photo/shirt.jpg?camera_label=${label}`;
const models = ['person-1-front', 'person-2', 'person-3-front', 'person-4-front', 'person-5-context'];
const images = ['front', 'back', 'folded', 'size-chart', 'person-1-back', 'person-3-left-sleeve', ...models].map(label => image(label));

test('primary thumbnails show the shirt front, never models, backs, sleeves, or charts', () => {
  for (let i = 0; i < 40; i++) {
    assert.equal(productThumbnail(`design-${i}`, images), image('front'));
    assert.equal(productThumbnail(`design-${i}`, [...images].reverse()), image('front'));
  }
});

test('shirt colors vary consistently without model photos affecting the selection', () => {
  const expanded = [...images, image('front', 'ivory'), image('front-2'), image('person-1-context')];
  const selected = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const src = productThumbnail(`design-${i}`, expanded);
    assert.equal(new URL(src).searchParams.get('camera_label'), 'front');
    assert.equal(src, productThumbnail(`design-${i}`, [...expanded].reverse()));
    selected.add(src);
  }
  assert.equal(selected.size, 2);
});

test('thumbnail selection preserves gallery order, stays within the product, and handles missing models', () => {
  const original = [...images];
  const selected = productThumbnail('shirt', images);
  assert.ok(images.includes(selected));
  assert.deepEqual(images, original);
  assert.equal(productThumbnail('legacy', ['/curated-model.png', '/back.png']), '/curated-model.png');
  assert.equal(productThumbnail('flat', [image('front'), image('back')]), image('front'));
  assert.equal(productThumbnail('legacy-shirt', ['/Person%201.png', '/Front.png', '/Back.png']), '/Front.png');
  assert.equal(productThumbnail('alternate', [image('person-1-front'), image('front-2')]), image('front-2'));
  assert.equal(productThumbnail('folded-only', [image('back'), image('folded')]), image('folded'));
  assert.equal(productThumbnail('missing', []), '/logo.png');
});
