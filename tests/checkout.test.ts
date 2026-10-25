import test from "node:test";
import assert from "node:assert/strict";
import {
  signCheckout,
  verifyCheckout,
  verifyCompletedPayment,
  type PayPalPayment,
} from "../src/lib/checkoutSecurity.ts";
import {
  cartRequestSchema,
  checkoutCustomerSchema,
} from "../src/lib/checkoutSchema.ts";
import { buildCheckoutQuote } from "../src/lib/checkout.ts";
import type { PrintifyProduct } from "../src/lib/printify.ts";

const secret = "test-secret-never-used-in-production";
const value = { id: "KK-TEST", total: 42.5, expiresAt: 2000 };
test("signed quotes round-trip and cannot be changed to a cheaper total", () => {
  const token = signCheckout(value, secret);
  assert.deepEqual(verifyCheckout(token, secret, 1000), value);
  const cheaper = Buffer.from(
    JSON.stringify({ ...value, total: 0.01 }),
  ).toString("base64url");
  assert.throws(
    () => verifyCheckout(`${cheaper}.${token.split(".")[1]}`, secret, 1000),
    /QUOTE_INVALID/,
  );
  assert.throws(
    () => verifyCheckout(token, "wrong-secret", 1000),
    /QUOTE_INVALID/,
  );
});
test("expired, malformed, and oversized quotes are rejected", () => {
  assert.throws(
    () => verifyCheckout(signCheckout(value, secret), secret, 2000),
    /QUOTE_EXPIRED/,
  );
  for (const input of ["", "hello", "a.b.c", "x".repeat(40001)])
    assert.throws(() => verifyCheckout(input, secret));
});

const expected = { id: "KK-TEST", currency: "USD", total: 42.5 };
const payment: PayPalPayment = {
  id: "PAYPAL-TEST",
  status: "COMPLETED",
  purchase_units: [
    {
      custom_id: expected.id,
      payments: {
        captures: [
          {
            id: "CAPTURE-TEST",
            status: "COMPLETED",
            amount: { value: "42.50", currency_code: "USD" },
          },
        ],
      },
    },
  ],
};
test("a completed capture must match the saved order, currency, and exact total", () => {
  assert.equal(verifyCompletedPayment(payment, expected), "CAPTURE-TEST");
  assert.throws(
    () => verifyCompletedPayment(payment, { ...expected, total: 42.51 }),
    /PAYMENT_AMOUNT_MISMATCH/,
  );
  assert.throws(
    () => verifyCompletedPayment(payment, { ...expected, currency: "PHP" }),
    /PAYMENT_AMOUNT_MISMATCH/,
  );
  assert.throws(
    () => verifyCompletedPayment(payment, { ...expected, id: "OTHER" }),
    /PAYMENT_NOT_COMPLETED/,
  );
});
test("approval, pending capture, missing capture, and multiple captures never count as paid", () => {
  assert.throws(() =>
    verifyCompletedPayment({ ...payment, status: "APPROVED" }, expected),
  );
  const pending = structuredClone(payment);
  pending.purchase_units![0].payments!.captures![0].status = "PENDING";
  assert.throws(() => verifyCompletedPayment(pending, expected));
  const missing = structuredClone(payment);
  missing.purchase_units![0].payments!.captures = [];
  assert.throws(() => verifyCompletedPayment(missing, expected));
  const multiple = structuredClone(payment);
  multiple.purchase_units![0].payments!.captures!.push(
    multiple.purchase_units![0].payments!.captures![0],
  );
  assert.throws(() => verifyCompletedPayment(multiple, expected));
});
test("cart requests use SKU/quantity only and reject invalid quantities", () => {
  assert.deepEqual(
    cartRequestSchema.parse([
      { sku: "tee-ivory-s", qty: 1, price: 0.01, printifyVariantId: 999 },
    ]),
    [{ sku: "tee-ivory-s", qty: 1 }],
  );
  for (const qty of [0, -1, 1.5, 21, Infinity])
    assert.equal(
      cartRequestSchema.safeParse([{ sku: "tee", qty }]).success,
      false,
    );
  assert.equal(
    cartRequestSchema.safeParse([
      { sku: "tee", qty: 15 },
      { sku: "other", qty: 15 },
    ]).success,
    false,
  );
});
test("address validation is shared by server and form, trims whitespace, and rejects unsupported countries", () => {
  const c = {
    email: " test@example.com ",
    firstName: " Buyer ",
    lastName: " Test ",
    address1: "123 Test Street",
    city: "Austin",
    state: "TX",
    postalCode: "78701",
    country: "US",
  };
  assert.equal(checkoutCustomerSchema.parse(c).firstName, "Buyer");
  assert.equal(
    checkoutCustomerSchema.safeParse({ ...c, firstName: "   " }).success,
    false,
  );
  assert.equal(
    checkoutCustomerSchema.safeParse({ ...c, country: "XX" }).success,
    false,
  );
  assert.equal(
    checkoutCustomerSchema.safeParse({ ...c, postalCode: "bad" }).success,
    false,
  );
  assert.equal(
    checkoutCustomerSchema.safeParse({
      ...c,
      country: "SG",
      state: "",
      postalCode: "238801",
    }).success,
    true,
  );
});

const customer = {
  email: "test@example.com",
  firstName: "Test",
  lastName: "Buyer",
  address1: "123 Test Street",
  city: "Austin",
  state: "TX",
  postalCode: "78701",
  country: "US",
};
const catalog = [
  {
    slug: "test",
    title: "Test tee",
    price: 30,
    images: ["/test.png"],
    variants: [
      {
        sku: "tee-ivory-s",
        color: "Ivory",
        size: "S",
        variantId: 100,
        printifyProductId: "product-1",
        isAvailable: true,
      },
    ],
  },
];
const printify = {
  id: "product-1",
  title: "Tee",
  images: [],
  options: [],
  variants: [
    {
      id: 100,
      sku: "provider-sku",
      title: "Ivory / S",
      price: 3000,
      is_enabled: true,
      is_available: true,
      options: [],
    },
  ],
  created_at: "",
  updated_at: "",
  visible: true,
} satisfies PrintifyProduct;
const deps = {
  getCatalogProducts: async () => catalog,
  getProduct: async () => printify,
  getEnvShopId: () => 1,
  calculateShipping: async () => ({ standard: 899 }),
};
test("shipping quote uses catalog prices and IDs, merges quantities, and includes provider shipping", async () => {
  const quote = await buildCheckoutQuote(
    {
      customer,
      cart: [
        {
          sku: "tee-ivory-s",
          qty: 1,
          price: 0.01,
          printifyProductId: "attacker-product",
        },
        { sku: "tee-ivory-s", qty: 2 },
      ],
    },
    deps,
  );
  assert.equal(quote.subtotal, 90);
  assert.equal(quote.shipping, 8.99);
  assert.equal(quote.total, 98.99);
  assert.equal(quote.items.length, 1);
  assert.equal(quote.items[0].qty, 3);
  assert.equal(quote.items[0].printifyProductId, "product-1");
});
test("checkout rejects unknown SKUs and live disabled/unavailable variants before quoting shipping", async () => {
  await assert.rejects(
    buildCheckoutQuote({ customer, cart: [{ sku: "unknown", qty: 1 }] }, deps),
    /VARIANT_UNAVAILABLE/,
  );
  for (const changes of [{ is_enabled: false }, { is_available: false }]) {
    await assert.rejects(
      buildCheckoutQuote(
        { customer, cart: [{ sku: "tee-ivory-s", qty: 1 }] },
        {
          ...deps,
          getProduct: async () => ({
            ...printify,
            variants: [{ ...printify.variants[0], ...changes }],
          }),
          calculateShipping: async () => {
            assert.fail("Unavailable items must not reach shipping");
          },
        },
      ),
      /VARIANT_UNAVAILABLE/,
    );
  }
});

test('checkout charges the selected size price, not the product base price or browser price', async () => {
  const quote = await buildCheckoutQuote({ customer, cart: [{ sku: 'tee-ivory-s', qty: 2, price: 0.01 }] }, {
    ...deps, getCatalogProducts: async () => [{ ...catalog[0], price: 34.99, variants: [{ ...catalog[0].variants[0], price: 44.99, size: '4XL' }] }],
  });
  assert.equal(quote.items[0].price, 44.99); assert.equal(quote.subtotal, 89.98); assert.equal(quote.total, 98.97);
});
test("missing, negative, or fractional shipping costs never become a payable quote", async () => {
  for (const rates of [{}, { standard: -1 }, { standard: 1.5 }]) {
    await assert.rejects(
      buildCheckoutQuote(
        { customer, cart: [{ sku: "tee-ivory-s", qty: 1 }] },
        { ...deps, calculateShipping: async () => rates },
      ),
      /SHIPPING_UNAVAILABLE/,
    );
  }
});
