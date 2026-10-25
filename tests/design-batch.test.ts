import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const batch = JSON.parse(readFileSync(resolve(root, 'designs/second-drop.json'), 'utf8')) as {
  frontWidthInches: number; minimumDpi: number; retailPriceCents: number;
  designs: { slug: string; artwork: string; colors: string[] }[];
};

test('second drop adds exactly ten distinct products without reusing the first drop slugs', () => {
  const first = JSON.parse(readFileSync(resolve(root, 'designs/first-drop.json'), 'utf8')) as { designs: { slug: string }[] };
  assert.equal(batch.designs.length, 10);
  assert.equal(new Set(batch.designs.map(d => d.slug)).size, 10);
  for (const d of batch.designs) {
    assert.match(d.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(first.designs.some(previous => previous.slug === d.slug), false);
    assert.ok(d.colors.length > 0 && d.colors.every(c => ['Graphite', 'Ivory', 'China Blue'].includes(c)));
  }
  assert.equal(batch.retailPriceCents, 3000);
});

test('all ten prepared assets are separate alpha PNGs within print and upload limits', () => {
  for (const d of batch.designs) {
    assert.ok(d.artwork.startsWith('Kami Kulture Photos/Designs/Print-ready/'));
    const bytes = readFileSync(resolve(root, d.artwork));
    assert.deepEqual(bytes.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    assert.ok([4, 6].includes(bytes[25]), `${d.slug} needs an alpha channel`);
    assert.ok(bytes.readUInt32BE(16) / batch.frontWidthInches >= batch.minimumDpi);
    assert.ok(bytes.length <= 5 * 1024 * 1024);
  }
});

test('importer rejects a missing manifest argument before making API calls', () => {
  const result = spawnSync(process.execPath, ['scripts/create-design-drafts.mjs', '--manifest', '--apply'], { cwd: root, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--manifest requires a JSON path/);
});
