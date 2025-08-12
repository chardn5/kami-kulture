import 'server-only';

const ENV = process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox';
const BASE_URL = ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const BRAND_NAME = process.env.BRAND_NAME ?? 'Kami Kulture';

type CreateOrderResponse = { id: string; status: string };
type CaptureOrderResponse = Record<string, unknown>;

async function getAccessToken(): Promise<string> {
  const client = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_CLIENT_SECRET!;
  const auth = Buffer.from(`${client}:${secret}`).toString('base64');

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`PayPal token error: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

// MVP product data (server-side to prevent tampering)
const PRODUCTS = {
  'kami-tee': { name: 'Kami Tee', price: 29.0, currency: 'USD' },
} as const;

export async function createOrder(productSlug: keyof typeof PRODUCTS, qty = 1) {
  const product = PRODUCTS[productSlug];
  if (!product) throw new Error('Unknown product');
  const accessToken = await getAccessToken();
  const amount = (product.price * qty).toFixed(2);

  const res = await fetch(`${BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: product.currency,
            value: amount,
            breakdown: { item_total: { currency_code: product.currency, value: amount } },
          },
          items: [
            {
              name: product.name,
              quantity: String(qty),
              unit_amount: { currency_code: product.currency, value: product.price.toFixed(2) },
              category: 'PHYSICAL_GOODS',
            },
          ],
        },
      ],
      application_context: {
        brand_name: BRAND_NAME,
        user_action: 'PAY_NOW',
        shipping_preference: 'GET_FROM_FILE',
      },
    }),
  });
  if (!res.ok) throw new Error(`PayPal create error: ${res.status} ${await res.text()}`);
  return (await res.json()) as CreateOrderResponse;
}

export async function captureOrder(orderID: string) {
  const accessToken = await getAccessToken();
  const res = await fetch(`${BASE_URL}/v2/checkout/orders/${orderID}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`PayPal capture error: ${res.status} ${await res.text()}`);
  return (await res.json()) as CaptureOrderResponse;
}

export async function showOrder(orderId: string) {
  const base = process.env.PAYPAL_ENV === 'sandbox'
    ? 'https://api.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

  // reuse your existing getAccessToken() logic
  const token = await getAccessToken();

  const res = await fetch(`${base}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Show order failed: ${res.status} ${JSON.stringify(json)}`);
  return json;
}
