import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
type Batch = { frontWidthInches: number; minimumDpi: number; retailPriceCents: number; designs: { slug: string; title: string; artwork: string; colors: string[] }[] };
const readBatch = (name: string): Batch => JSON.parse(readFileSync(resolve(root, `designs/${name}.json`), 'utf8'));
const batches = [readBatch('third-drop'), readBatch('fourth-drop')];

test('remaining drop adds eighteen unique listings without changing or duplicating existing slugs', () => {
  const previous = [...readBatch('first-drop').designs, ...readBatch('second-drop').designs];
  const designs = batches.flatMap(b => b.designs);
  assert.equal(designs.length, 18);
  assert.equal(new Set(designs.map(d => d.slug)).size, 18);
  for (const batch of batches) {
    assert.equal(batch.designs.length, 9);
    assert.equal(batch.retailPriceCents, 3000);
    for (const d of batch.designs) {
      assert.equal(previous.some(p => p.slug === d.slug), false);
      assert.match(d.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.ok(d.colors.length && d.colors.every(c => ['Ivory', 'Graphite', 'China Blue'].includes(c)));
    }
  }
});

test('all remaining assets are separate alpha PNGs within the source resolution and upload limits', () => {
  for (const batch of batches) for (const d of batch.designs) {
    assert.ok(d.artwork.startsWith('Kami Kulture Photos/Designs/Print-ready/'));
    const bytes = readFileSync(resolve(root, d.artwork));
    assert.deepEqual(bytes.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    assert.ok([4, 6].includes(bytes[25]), `${d.slug}: alpha channel required`);
    assert.ok(bytes.readUInt32BE(16) / batch.frontWidthInches >= batch.minimumDpi);
    assert.ok(bytes.length <= 5 * 1024 * 1024);
  }
});

test('artwork record retains one original source and a saved edit prompt for each remaining design', () => {
  const record = JSON.parse(readFileSync(resolve(root, 'designs/remaining-artwork.json'), 'utf8')) as {
    designs: { slug: string; source: string; prompt: string; finalPath: string }[];
  };
  assert.equal(record.designs.length, 18);
  assert.equal(new Set(record.designs.map(d => d.source)).size, 18);
  for (const d of record.designs) {
    assert.ok(readFileSync(resolve(root, 'Kami Kulture Photos/Designs', d.source)).length > 0);
    assert.ok(d.prompt.length > 100);
    assert.equal(d.finalPath, `Kami Kulture Photos/Designs/Print-ready/${d.slug}.png`);
    assert.ok(batches.some(b => b.designs.some(p => p.slug === d.slug && p.artwork === d.finalPath)));
  }
});
