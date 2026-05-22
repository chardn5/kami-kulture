import { NextRequest, NextResponse } from 'next/server';
import { calculateOrderPricing } from '@/lib/pricing';

export const runtime = 'nodejs';

const PP_BASE =
  process.env.PAYPAL_ENV === 'live' || process.env.PAYPAL_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

// Accept either PAYPAL_CLIENT_SECRET or PAYPAL_SECRET
function getSecrets() {
  const id = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_SECRET;
  if (!id || !secret) {
    throw new Error(
      'Missing PayPal credentials: set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET (or PAYPAL_SECRET).'
    );
  }
  return { id, secret };
}

async function getAccessToken(): Promise<string> {
  const { id, secret } = getSecrets();
  const basic = Buffer.from(`${id}:${secret}`).toString('base64');

  const res = await fetch(`${PP_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal token failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

/* ---------------------------- Request typing ---------------------------- */

type CreateOrderRequest = {
  // minimal mode
  value?: number | string;
  currency?: string;
  shippingAmount?: number | string;
  taxAmount?: number | string;

  // optional detailed cart
  items?: Array<{
    name: string;
    sku?: string;
    unit_amount: { currency_code: string; value: string | number };
    quantity: string | number;
    category?: 'PHYSICAL_GOODS' | 'DIGITAL_GOODS';
  }>;

  // optional shipping/payer (can be added later once baseline works)
  shipping?: {
    name?: { full_name?: string };
    address: {
      address_line_1?: string;
      address_line_2?: string;
      admin_area_1?: string;
      admin_area_2?: string;
      postal_code?: string;
      country_code: string; // ISO-2
    };
  };
  payer?: {
    email_address?: string;
    name?: { given_name?: string; surname?: string };
  };
};

function to2(v: number) {
  return v.toFixed(2);
}

function parseNumber(n: string | number | undefined): number | undefined {
  if (typeof n === 'number') return n;
  if (typeof n === 'string') {
    const x = Number(n);
    return Number.isFinite(x) ? x : undefined;
  }
  return undefined;
}

/* -------------------------------- Route -------------------------------- */

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<CreateOrderRequest>;
    const currency = (body.currency ?? 'USD').toUpperCase();

    // Build purchase unit (either from items[] or from value)
    let itemTotal = 0;
    let items = body.items;

    if (items && items.length > 0) {
      // normalize quantities and amounts, compute item_total
      items = items.map((it) => {
        const qty = parseNumber(it.quantity) ?? 1;
        const unit = parseNumber(it.unit_amount?.value) ?? 0;
        itemTotal += qty * unit;
        return {
          ...it,
          quantity: String(qty),
          unit_amount: { currency_code: currency, value: to2(unit) },
        };
      });
    } else {
      itemTotal = parseNumber(body.value) ?? 0;
    }
    const pricing = calculateOrderPricing(itemTotal, currency);
    const shippingAmount = Math.max(parseNumber(body.shippingAmount) ?? pricing.shipping, pricing.shipping);
    const taxAmount = Math.max(parseNumber(body.taxAmount) ?? pricing.tax, pricing.tax);
    const amountValue = to2(itemTotal + shippingAmount + taxAmount);
    const breakdown = {
      item_total: { currency_code: currency, value: to2(itemTotal) },
      shipping: { currency_code: currency, value: to2(shippingAmount) },
      tax_total: { currency_code: currency, value: to2(taxAmount) },
    };

    const token = await getAccessToken();

    const payload = {
      intent: 'CAPTURE' as const,
      purchase_units: [
        {
          ...(items && items.length > 0 ? { items } : {}),
          amount: {
            currency_code: currency,
            value: amountValue,
            breakdown,
          },
          ...(body.shipping ? { shipping: body.shipping } : {}),
        },
      ],
      ...(body.payer ? { payer: body.payer } : {}),
      // If you want to force using your provided address later:
      // application_context: { shipping_preference: 'SET_PROVIDED_ADDRESS' },
    };

    const res = await fetch(`${PP_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      console.error('PAYPAL_CREATE_FAIL', { status: res.status, json, payload });
      return NextResponse.json(
        { ok: false, error: 'CREATE_FAILED', detail: json },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, id: json.id }, { status: 200 });
  } catch (e) {
    console.error('/api/paypal/create-order error', e);
    return NextResponse.json({ ok: false, error: 'CREATE_FAILED' }, { status: 500 });
  }
}
