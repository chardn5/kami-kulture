# Store operations

## Admin

- Open `/admin` or `/admin/sign-in` on the production domain.
- Use the existing server-configured admin username and password. There is no public registration.
- Signed HTTP-only sessions expire after one hour. Sign out uses POST, not prefetched GET requests.
- Overview shows historical captured orders and operational queues. Sandbox totals are not real revenue.
- Orders include search, status filters, pagination, customer/address/items, payment references, Printify controls, tracking, and receipt status.
- Payments shows verified webhook events and allows pending receipt/admin-notification retries.
- Refunds and production cancellations must still be performed in the provider dashboards. Refund/reversal/denial webhook events are flagged for manual review.

## Retail pricing

Website retail policy lives in `src/lib/retailPricing.ts`: S-XL $34.99, 2XL $36.99, 3XL $39.99, 4XL-5XL $44.99.
5XL is an existing option on the legacy Gildan shirt and uses the highest approved tier.
Prices apply to product selection, cart, and server-verified checkout. Shipping is separately quoted by Printify.
Printify's draft retail fields are not the website's price source and do not determine production charges.
Managed-design imports preserve the website retail policy rather than copying old draft prices.

Run `node --env-file=.env --env-file=.env.local --import tsx scripts/update-retail-prices.ts` for a dry run; add `--apply` to update catalog rows.
The apply command first saves a price-only rollback snapshot under ignored `.vercel/backups/`. It never rewrites historical order totals.

## PayPal webhooks

Endpoint: `https://www.kamikulture.com/api/paypal/webhook`.
The current registration is SANDBOX, using the same app credentials as checkout. `PAYPAL_WEBHOOK_ID` must match that registration and environment.
The endpoint verifies signatures using PayPal's verification API before processing or recording an event.

Subscriptions:
- `CHECKOUT.ORDER.APPROVED`: recover capture if the buyer closes the browser.
- `PAYMENT.CAPTURE.COMPLETED`: independently fetch and reconcile the PayPal order against the saved amount, currency, environment, and order ID.
- `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED`, `PAYMENT.CAPTURE.DENIED`: record a manual-review alert.

Browser capture and webhook delivery share one completion path. The paid transition is conditional; notification processing uses a database lease and separate sent timestamps. Resend idempotency keys protect close retries (provider retention is 24 hours, not a permanent exactly-once guarantee).
The existing daily Printify cron also retries pending notifications; the admin Payments page can retry immediately.
Interrupted or ambiguous automatic Printify submissions are not automatically resubmitted. Reconcile them in Printify before any manual retry.

`scripts/configure-paypal-webhook.ts --apply` registers/updates the sandbox subscription without deleting other webhooks.
Live payments require separate live credentials AND a matching live webhook registration/ID. Do not simply change `PAYPAL_ENV` alone.
Before live launch, test a genuine sandbox approval, webhook delivery, duplicate delivery, receipt, order/address mapping, and then a controlled live purchase/refund after explicit approval.

Tax collection has not been changed by this release. Supplier tax, merchant registration/filing obligations, and customer sales-tax collection are distinct.
