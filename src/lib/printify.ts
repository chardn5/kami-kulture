// src/lib/printify.ts
// Lightweight Printify API wrapper for server-side use in Next.js (Node runtime)

const PRINTIFY_BASE = 'https://api.printify.com/v1';

function getApiToken(): string {
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) {
    throw new Error('Missing PRINTIFY_API_TOKEN in environment.');
  }
  return token;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

async function callPrintify<T>(
  path: string,
  opts: { method?: HttpMethod; body?: unknown; search?: Record<string, string | number | boolean | undefined> } = {}
): Promise<T> {
  const url = new URL(`${PRINTIFY_BASE}${path}`);
  if (opts.search) {
    Object.entries(opts.search).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }

  const res = await fetch(url.toString(), {
    method: opts.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${getApiToken()}`,
      'Content-Type': 'application/json',
    },
    // Only include body for non-GET
    body: opts.method && opts.method !== 'GET' ? JSON.stringify(opts.body ?? {}) : undefined,
    // Ensure we never cache API results in Next.js
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Printify API error ${res.status} ${res.statusText}: ${text}`);
  }

  return (await res.json()) as T;
}

/** ====== Types (trimmed to what we need first) ====== */

export type PrintifyShop = {
  id: number;
  title: string;
  sales_channel: string;
};

export type PrintifyImage = {
  src: string;
  variant_ids?: number[];
};

export type PrintifyVariant = {
  id: number;
  sku: string;
  title: string; // e.g., "Black / L"
  price: number; // in cents
  is_enabled: boolean;
  is_available: boolean;
  options: number[]; // indexes into product.options[*].values
  grams?: number;
};

export type PrintifyOption = {
  name: string; // e.g., "Color"
  type: 'color' | 'size' | 'dropdown';
  values: { id: number; title: string; color?: string }[];
};

export type PrintifyProduct = {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  visible: boolean;
  is_locked?: boolean;
  images: PrintifyImage[];
  variants: PrintifyVariant[];
  options: PrintifyOption[];
  tags?: string[];
  // There are many more fields; we keep it lean for now.
};

export type ListProductsResponse = {
  data: PrintifyProduct[];
  current_page?: number;
  last_page?: number;
};

/** ====== Public API helpers ====== */

/** Get shops connected to this Printify account */
export async function getShops() {
  return callPrintify<PrintifyShop[]>('/shops.json');
}

/** List products for a shop (paginated) */
export async function listProducts(shopId: number | string, params?: { page?: number; limit?: number; status?: 'all' | 'published' | 'draft' }) {
  return callPrintify<ListProductsResponse>(`/shops/${shopId}/products.json`, {
    search: {
      page: params?.page ?? 1,
      limit: params?.limit ?? 30, // Printify default is 30
      status: params?.status ?? 'published',
    },
  });
}

/** Get a single product (full detail) */
export async function getProduct(shopId: number | string, productId: string) {
  return callPrintify<PrintifyProduct>(`/shops/${shopId}/products/${productId}.json`);
}

/** ====== Order creation (to be used after PayPal capture) ====== */

export type PrintifyOrderLineItem = {
  product_id: string;     // Printify product ID
  variant_id: number;     // Variant ID chosen by customer
  quantity: number;
};

export type PrintifyAddress = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;
  region?: string;        // state/province
  zip: string;
  country: string;        // ISO2, e.g., "PH"
};

export type CreateOrderPayload = {
  external_id?: string;           // your internal order id
  label?: string;                 // optional
  line_items: PrintifyOrderLineItem[];
  shipping_method?: number;       // 1 = Economy, 2 = Standard, 3 = Express (varies by provider)
  send_shipping_notification?: boolean;
  address_to: PrintifyAddress;
};

export type CreateOrderResponse = {
  id: string;
  status: string;
  created_at: string;
  // ... more fields
};

/** Create an order in Printify for fulfillment */
export async function createOrder(shopId: number | string, payload: CreateOrderPayload) {
  return callPrintify<CreateOrderResponse>(`/shops/${shopId}/orders.json`, {
    method: 'POST',
    body: payload,
  });
}

/** Convenience: read SHOP_ID from env with a safe fallback */
export function getEnvShopId(): number {
  const raw = process.env.PRINTIFY_SHOP_ID;
  if (!raw) throw new Error('Missing PRINTIFY_SHOP_ID in environment.');
  const id = Number(raw);
  if (Number.isNaN(id)) throw new Error('PRINTIFY_SHOP_ID must be numeric (from Printify dashboard).');
  return id;
}
