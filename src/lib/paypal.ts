const PAYPAL_BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export async function getAccessToken() {
  const id = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_CLIENT_SECRET!;
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to get PayPal token");
  return res.json() as Promise<{ access_token: string }>;
}

export async function createPaypalOrderServer(amountUSD: string) {
  const { access_token } = await getAccessToken();
  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: "USD", value: amountUSD },
        },
      ],
      application_context: {
        brand_name: "Kami Kulture",
        shipping_preference: "GET_FROM_FILE",
        user_action: "PAY_NOW",
        return_url: "https://kamikulture.com/thanks",
        cancel_url: "https://kamikulture.com/cancel",
      },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Create order failed: ${t}`);
  }
  return res.json();
}

export async function capturePaypalOrderServer(orderId: string) {
  const { access_token } = await getAccessToken();
  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Capture failed: ${t}`);
  }
  return res.json();
}
