import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const PP_BASE =
  process.env.PAYPAL_ENV === 'live' || process.env.PAYPAL_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api.sandbox.paypal.com';

async function getAccessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_CLIENT_SECRET!;
  if (!id || !secret) throw new Error('Missing PayPal credentials');

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

  const json = (await res.json()) as { access_token?: string };
  if (!res.ok || !json.access_token) {
    throw new Error('Failed to fetch PayPal access token');
  }
  return json.access_token;
}

/* ---------- helpers to parse the request body safely ---------- */

type CreateBody = {
  title?: string;
  product?: string;
  qty?: number;
  currency?: string;
  amount?: number | string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

async function readBody(req: NextRequest): Promise<CreateBody> {
  try {
    const raw: unknown = await req.json();
    if (!isRecord(raw)) return {};
    const out: CreateBody = {};

    if (typeof raw.title === 'string') out.title = raw.title;
    if (typeof raw.product === 'string') out.product = raw.product;
    if (typeof raw.currency === 'string') out.currency = raw.currency;

    if (typeof raw.qty === 'number') out.qty = raw.qty;
    else if (typeof raw.qty === 'string') {
      const n = Number(raw.qty);
      if (!Number.isNaN(n)) out.qty = n;
    }

    if (typeof raw.amount === 'number' || typeof raw.amount === 'string') {
      out.amount = raw.amount;
    }

    return out;
  } catch {
    return {};
  }
}

/* ------------------------------ route ------------------------------ */

export async function POST(req: NextRequest) {
  try {
    const body = await readBody(req);

    const title = body.title ?? 'Kami Tee';
    const sku = body.product ?? 'kami-tee';
    const qty = body.qty && body.qty > 0 ? body.qty : 1;
    const currency = body.currency ?? 'USD';

    const unitNum =
      typeof body.amount === 'number'
        ? body.amount
        : typeof body.amount === 'string'
        ? Number(body.amount)
        : 29;

    const unit = Number.isFinite(unitNum) ? unitNum : 29;
    const total = (unit * qty).toFixed(2);

    const token = await getAccessToken();

    const res = await fetch(`${PP_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            items: [
              {
                name: title,
                sku,
                unit_amount: { currency_code: currency, value: unit.toFixed(2) },
                quantity: String(qty),
              },
            ],
            amount: {
              currency_code: currency,
              value: total,
              breakdown: {
                item_total: { currency_code: currency, value: total },
              },
            },
          },
        ],
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      console.error('PAYPAL_CREATE_FAIL', json);
      return NextResponse.json({ ok: false, error: 'CREATE_FAILED' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: json.id }, { status: 200 });
  } catch (e) {
    console.error('/api/paypal/create-order', e);
    return NextResponse.json({ ok: false, error: 'CREATE_FAILED' }, { status: 500 });
  }
}
