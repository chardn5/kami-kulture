import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { parseEnv } from 'node:util';

const root = resolve(import.meta.dirname, '..');
for (const name of ['.env.local', '.env']) {
  const values = parseEnv(await readFile(resolve(root, name), 'utf8').catch(() => ''));
  for (const [key, value] of Object.entries(values)) if (process.env[key] === undefined) process.env[key] = value;
}
const apply = process.argv.includes('--apply');
const manifestFlag = process.argv.indexOf('--manifest');
if (manifestFlag !== -1 && (!process.argv[manifestFlag + 1] || process.argv[manifestFlag + 1].startsWith('--'))) throw new Error('--manifest requires a JSON path.');
const manifestPath = resolve(root, manifestFlag === -1 ? 'designs/first-drop.json' : process.argv[manifestFlag + 1]);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const journalPath = resolve(dirname(manifestPath), `${basename(manifestPath, '.json')}-results.json`);
if (!Array.isArray(manifest.designs) || !manifest.designs.length || manifest.designs.length > 10) throw new Error('Each batch must contain 1 to 10 designs.');
if (new Set(manifest.designs.map(d => d.slug)).size !== manifest.designs.length) throw new Error('Design slugs must be unique within a batch.');
const journal = JSON.parse(await readFile(journalPath, 'utf8').catch(() => '{}'));
const token = process.env.PRINTIFY_API_TOKEN;
const shop = process.env.PRINTIFY_SHOP_ID;
if (!token || !/^\d+$/.test(shop ?? '')) throw new Error('Configure PRINTIFY_API_TOKEN and PRINTIFY_SHOP_ID.');
const base = 'https://api.printify.com/v1';
async function api(path, body) {
  const r = await fetch(base + path, {
    method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'KamiKultureDrafts/1.0' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) { console.error('Printify request failed:', r.status, path); throw new Error(`Printify HTTP ${r.status}`); }
  return r.json();
}
async function save() { await mkdir(dirname(journalPath), { recursive: true }); await writeFile(journalPath, JSON.stringify(journal, null, 2) + '\n'); }
const template = await api(`/shops/${shop}/products/${manifest.templateProductId}.json`);
const provider = await api(`/catalog/blueprints/${template.blueprint_id}/print_providers/${template.print_provider_id}/variants.json`);
const remote = [];
for (let page = 1; ; page++) {
  const result = await api(`/shops/${shop}/products.json?limit=50&page=${page}`);
  remote.push(...result.data);
  if (result.data.length < 50) break;
}
for (const design of manifest.designs) {
  const bytes = await readFile(resolve(root, design.artwork));
  if (!bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error(`${design.slug}: PNG required`);
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20), colorType = bytes[25];
  if (![4, 6].includes(colorType)) throw new Error(`${design.slug}: transparency required`);
  if (bytes.length > 5 * 1024 * 1024) throw new Error(`${design.slug}: upload exceeds 5MB; use a hosted upload URL`);
  const dpi = Math.round(width / manifest.frontWidthInches);
  if (dpi < manifest.minimumDpi) throw new Error(`${design.slug}: only ${dpi} DPI at the requested print width`);
  const artworkHash = createHash('sha256').update(bytes).digest('hex');
  const tag = `kami:slug:${design.slug}`;
  const matches = remote.filter(p => p.tags?.includes(tag));
  if (matches.length > 1) throw new Error(`${design.slug}: multiple remote drafts found; review duplicates first`);
  if (matches[0]) {
    if (!matches[0].tags.includes(`kami:art:${artworkHash.slice(0, 16)}`)) throw new Error(`${design.slug}: source changed; create a versioned design instead of overwriting the existing product`);
    journal[design.slug] = { ...journal[design.slug], productId: matches[0].id, artworkHash, status: 'draft-created' };
    if (apply) await save();
    console.log(JSON.stringify({ slug: design.slug, existing: true, productId: matches[0].id })); continue;
  }
  const colors = template.options.find(o => o.type === 'color');
  const colorIds = design.colors.map(name => { const c = colors.values.find(v => v.title === name); if (!c) throw new Error(`Unknown template color ${name}`); return c.id; });
  const variants = template.variants.filter(v => v.is_enabled && v.is_available && v.options.some(id => colorIds.includes(id)));
  if (!variants.length) throw new Error(`${design.slug}: no enabled template variants`);
  const selectedIds = new Set(variants.map(v => v.id));
  const areas = [];
  for (const area of template.print_areas) {
    const variantIds = area.variant_ids.filter(id => selectedIds.has(id));
    if (!variantIds.length) continue;
    // Group by placeholder dimensions so every size gets the same physical print width.
    const groups = new Map();
    for (const id of variantIds) {
      const front = provider.variants.find(v => v.id === id)?.placeholders.find(p => p.position === 'front');
      if (!front?.width || !front?.height) throw new Error(`Missing front print dimensions for variant ${id}`);
      const key = `${front.width}x${front.height}`;
      if (!groups.has(key)) groups.set(key, { front, ids: [] });
      groups.get(key).ids.push(id);
    }
    for (const { front, ids } of groups.values()) {
      const scale = manifest.frontWidthInches * 300 / front.width;
      if (scale > 1 || manifest.frontWidthInches * height / width * 300 > front.height) throw new Error(`${design.slug}: design does not fit the print area`);
      areas.push({ variant_ids: ids, placeholders: area.placeholders.map(p => ({
        position: p.position, decoration_method: p.decoration_method ?? 'dtg',
        images: p.position === 'front' ? [{ id: 'UPLOAD_ID', x: 0.5, y: 0.42, scale, angle: 0 }] : p.images.map(i => ({ id: i.id, x: i.x, y: i.y, scale: i.scale, angle: i.angle ?? 0 })),
      })) });
    }
  }
  const plan = { slug: design.slug, title: design.title, variants: variants.length, colors: design.colors, artworkPixels: `${width}x${height}`, printWidthInches: manifest.frontWidthInches, effectiveDpi: dpi, retailPrice: manifest.retailPriceCents / 100 };
  console.log(JSON.stringify({ ...plan, mode: apply ? 'creating-draft' : 'dry-run' }));
  if (!apply) continue;
  let imageId = journal[design.slug]?.artworkHash === artworkHash ? journal[design.slug]?.uploadId : undefined;
  if (!imageId) {
    const uploaded = await api('/uploads/images.json', { file_name: `${design.slug}-${artworkHash.slice(0, 10)}.png`, contents: bytes.toString('base64') });
    imageId = uploaded.id;
    journal[design.slug] = { uploadId: imageId, artworkHash, status: 'uploaded', ...plan }; await save();
  }
  for (const area of areas) for (const p of area.placeholders) for (const image of p.images) if (image.id === 'UPLOAD_ID') image.id = imageId;
  const created = await api(`/shops/${shop}/products.json`, {
    title: design.title, description: design.description, blueprint_id: template.blueprint_id, print_provider_id: template.print_provider_id,
    visible: false, tags: ['kami:managed', tag, `kami:garment:${manifest.garmentKey}`, `kami:art:${artworkHash.slice(0, 16)}`, `kami:dpi:${dpi}`, `kami:width:${manifest.frontWidthInches}`, 'tee', 'unisex'],
    variants: template.variants.map(v => ({ id: v.id, price: manifest.retailPriceCents, is_enabled: selectedIds.has(v.id) })), print_areas: areas,
  });
  if (!created.id) throw new Error(`${design.slug}: creation returned no product ID`);
  journal[design.slug] = { ...journal[design.slug], productId: created.id, status: 'draft-created', createdAt: new Date().toISOString() }; await save();
  console.log(JSON.stringify({ slug: design.slug, productId: created.id, created: true, published: false }));
}

if (process.argv.includes('--sync-store')) {
  if (!apply) throw new Error('--sync-store requires --apply');
  const user = process.env.BASIC_AUTH_USER || process.env.ADMIN_USER;
  const pass = process.env.BASIC_AUTH_PASS || process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS;
  if (!user || !pass) throw new Error('Configure the existing store admin credentials locally.');
  const r = await fetch('https://www.kamikulture.com/api/admin/designs/import', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` },
    body: JSON.stringify({ productIds: manifest.designs.map(d => journal[d.slug].productId) }),
    redirect: 'error', signal: AbortSignal.timeout(120000),
  });
  if (!r.ok) throw new Error(`Store import failed: HTTP ${r.status}`);
  const result = await r.json();
  if (!result.ok) throw new Error('Some mockups are not ready. Retry --apply --sync-store after Printify finishes rendering.');
  console.log(JSON.stringify({ storeImported: result.results.length, reviewUrl: 'https://www.kamikulture.com/admin/designs', publishingPerformed: false }));
}
