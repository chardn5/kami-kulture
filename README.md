# Kami Kulture

Next.js storefront with PayPal checkout, Printify fulfillment, Prisma/Postgres orders, and transactional email.

## Local Development

Use Node 22.18+ (Node 24 recommended) and pnpm 10.28.0.

```sh
corepack pnpm install
corepack pnpm dev --port 3001
```

Copy environment settings into `.env.local`. Required settings are `DATABASE_URL`, `PRINTIFY_API_TOKEN`, `PRINTIFY_SHOP_ID`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` (or `PAYPAL_SECRET`), and `NEXT_PUBLIC_PAYPAL_CLIENT_ID`. Keep `PAYPAL_ENV=sandbox` and `NEXT_PUBLIC_PAYPAL_ENV=sandbox` during testing. The store charges USD.

Existing environment files contain private credentials and must not be committed. Vercel production secrets are not included when pulling environment settings.

To replace an expired Printify token without printing it or pasting it into chat:

```sh
node scripts/configure-printify.mjs
```

Generate the token in Printify's account Connections settings, then paste it at the hidden local prompt. The script validates it and updates `.env.local`; Vercel's `PRINTIFY_API_TOKEN` must also be updated for deployments. Grant the token access to the existing shop, products, shipping calculation, and orders as required by the integration.

## Checkout Flow

1. Catalog selectors use enabled Printify variants stored in Postgres. Unknown combinations are unavailable. Product images are matched to the selected color using variant IDs.
2. `/api/checkout/quote` validates the cart and address, gets prices from the server catalog, checks live Printify availability, and requests a standard shipping quote. Shipping amounts from Printify are USD cents. Missing rates and failed availability checks block payment.
3. A quote is signed and expires after 15 minutes. Signing uses `CHECKOUT_SIGNING_SECRET` when provided, or the existing PayPal server secret. Changing any item, amount, or delivery detail invalidates the signature.
4. `/api/paypal/create-order` accepts only a signed quote. It saves a `PENDING_PAYMENT` snapshot before opening PayPal. The snapshot ID becomes PayPal's `custom_id`. Repeated creation uses a stable PayPal request ID.
5. `/api/orders/capture` requires a PayPal order ID. It loads the saved snapshot, verifies the payment currency, exact total, matching order, and `COMPLETED` capture, then atomically claims the pending order. Browser-supplied prices, addresses, and fulfillment IDs are ignored. Repeated callbacks return the existing order without resending emails or fulfillment.

Pending payment snapshots do not appear in the normal admin order list, CSV export, or public order lookup. Older paid orders remain readable. Payment callbacks from tabs opened before this checkout update require a new checkout session.

PayPal sandbox payments never automatically create Printify fulfillment orders. An admin can still review and manually submit a test order; Printify is a real fulfillment service even when PayPal is in sandbox. Automatic submission only runs with live PayPal and `PRINTIFY_AUTO_SUBMIT=true`.

## Catalog & Operations

The existing protected `/api/printify/sync` endpoint updates catalog variants and image mappings. Refresh it when changing colors, sizes, or mockups in Printify. Checkout also checks live availability before producing a payable quote.

Product names, design copy, and retail prices live in `src/data/products.ts`. Garment specifications and size charts live in `src/data/garments.ts`, with the corresponding Printify catalog source URLs. No synthetic review ratings are published.

Shipping is quoted for the actual address; previous flat-rate/free-shipping settings no longer determine checkout charges. Import charges may be collected on delivery. Before accepting real orders, confirm your tax obligations and payment configuration for the regions you sell to.

Order status and tracking synchronization use the existing cron and admin actions. Sandbox mode and manual fulfillment remain available.

## Checks & Deployment

```sh
corepack pnpm test
corepack pnpm lint
corepack pnpm exec tsc --noEmit
corepack pnpm build
```

Regression tests cover signed quote tampering and expiry, server-controlled prices and variant IDs, quantity limits, unavailable products, unsupported shipping, and completed payment verification.

Stage a production build with `vercel deploy --prod --skip-domain`, verify it using the configured production secrets, and promote that tested deployment. Keep sandbox settings enabled until explicitly switching to live payments. Source design files and local setup tools are excluded from deployment by `.vercelignore`.
