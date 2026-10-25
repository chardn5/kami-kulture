# Design-to-shirt workflow

The first drop contains Training Arc Mode, Main Character Energy, and Lowkey Overpowered.
Originals are preserved in `Kami Kulture Photos/Designs/`. Separate alpha PNGs are in its `Print-ready/` subfolder.

## Create and import drafts

Use Node 24 and the existing local Printify/admin environment variables. Never commit or paste credentials.

```sh
node scripts/create-design-drafts.mjs
node scripts/create-design-drafts.mjs --apply --sync-store
```

Additional drops use their own manifest and retry journal:

```sh
node scripts/create-design-drafts.mjs --manifest designs/second-drop.json
node scripts/create-design-drafts.mjs --manifest designs/second-drop.json --apply --sync-store
```

Each batch supports up to 10 unique designs. Importing or rerunning a batch preserves any previous website
approval; it never publishes new products automatically. The second-drop artwork preparation record is in
`second-drop-artwork.json`. It contains the original filenames, edit prompts, and final project asset paths.

The first command validates the manifest without writing. The second uploads artwork, creates Printify drafts,
and imports their mockups to the website admin. It does not publish a new design. Review every color, front,
back logo, placement, sizes, and price at https://www.kamikulture.com/admin/designs before clicking Approve & publish.
The website approval is separate from Printify's sales-channel publishing state. Unpublish removes the website
listing and blocks new checkout quotes, but does not delete the Printify product or existing orders.

The script reuses tagged Printify products and checkpointed uploads on retries. It refuses duplicate slugs or
changed artwork under the same slug. To make a new version, use a new slug. Keep `first-drop-results.json` as
the non-secret creation journal. Run only one importer at a time. If mockups are pending, wait and retry.

For another batch, extend the manifest with a unique slug, title, description, transparent PNG path, and template
color names. Enabled and available template variants are copied. Every enabled variant uses the specified retail
price. The original back-logo placement is preserved. No orders or production charges are created by this script.
Supplier manufacturing and shipping costs still apply when an actual order is submitted to production.

## Print quality

The prepared sources are 1024 x 1536. At 6.5 inches wide they provide about 158 DPI, not 300 DPI.
The importer enforces a 150 DPI floor and actual provider print-area dimensions, and does not upscale pixels.
Review a physical sample before a public launch. Larger front prints need higher-resolution source artwork.

## Artwork edit record

Tool mode: built-in ImageGen image editing, one referenced original per image, transparent background enabled.

- `TrainingMode1.png` to `Print-ready/training-arc-mode.png`: preserve TRAINING ARC MODE: ON, the lifter,
  red progress bar, cream enclosed fills, and black outlines; remove only the outer paper backdrop to alpha.
- `MainCharacterEnergy.png` to `Print-ready/main-character-energy.png`: preserve MAIN CHARACTER ENERGY,
  distressed cream lettering and radial speed lines; remove the black backdrop and letter counters to alpha.
- `LowkeyOP1.png` to `Print-ready/lowkey-overpowered.png`: preserve LOWKEY OVERPOWERED and two white eyes;
  remove the gray/black backdrop and muddy glow, leaving white ink on alpha.

No original design files were overwritten. Printify supplies the garment mockups; they are not AI-generated
representations of the finished product. Reference: https://developers.printify.com/
