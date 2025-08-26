// src/lib/orderStore.ts
import fs from "fs/promises";
import path from "path";
import { sql } from "@vercel/postgres";

export type OrderRow = {
  time: string;          // ISO
  orderId: string;
  amount: string;        // "29.99"
  currency?: string;     // "USD"
  email?: string;
  customId?: string;     // e.g. sku|size|slug
};

const hasDB = !!process.env.DATABASE_URL; // set in Vercel for prod

/* ---------- JSON (dev) helpers ---------- */
function ordersPath() {
  return path.join(process.cwd(), ".data", "orders.json");
}
async function ensureDirExists(p: string) {
  const dir = path.dirname(p);
  await fs.mkdir(dir, { recursive: true }).catch(() => {});
}
async function readOrdersJson(): Promise<OrderRow[]> {
  const file = ordersPath();
  try {
    const buf = await fs.readFile(file, "utf8");
    const arr = JSON.parse(buf);
    return Array.isArray(arr) ? (arr as OrderRow[]) : [];
  } catch {
    return [];
  }
}
async function appendOrderJson(row: OrderRow) {
  const file = ordersPath();
  await ensureDirExists(file);
  const current = await readOrdersJson();
  current.unshift(row); // newest first
  await fs.writeFile(file, JSON.stringify(current, null, 2), "utf8");
}

/* ---------- DB (prod) helpers ---------- */
async function ensureTable() {
  await sql/* sql */`
    CREATE TABLE IF NOT EXISTS kk_orders (
      id SERIAL PRIMARY KEY,
      time TIMESTAMPTZ NOT NULL,
      order_id TEXT NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      currency TEXT,
      email TEXT,
      custom_id TEXT
    );
  `;
  // optional: avoid duplicates from retries
  await sql/* sql */`CREATE UNIQUE INDEX IF NOT EXISTS ux_kk_orders_order_id ON kk_orders(order_id);`;
}

async function readOrdersDb(): Promise<OrderRow[]> {
  await ensureTable();
  const { rows } = await sql/* sql */`
    SELECT time, order_id, amount, currency, email, custom_id
    FROM kk_orders
    ORDER BY time DESC
    LIMIT 500;
  `;
  return rows.map(r => ({
    time: (r.time as Date).toISOString(),
    orderId: String(r.order_id),
    amount: String(r.amount),
    currency: r.currency ?? undefined,
    email: r.email ?? undefined,
    customId: r.custom_id ?? undefined,
  }));
}

async function appendOrderDb(row: OrderRow) {
  await ensureTable();
  try {
    await sql/* sql */`
      INSERT INTO kk_orders (time, order_id, amount, currency, email, custom_id)
      VALUES (${row.time}, ${row.orderId}, ${row.amount}, ${row.currency ?? null}, ${row.email ?? null}, ${row.customId ?? null})
      ON CONFLICT (order_id) DO NOTHING;
    `;
  } catch {
    // swallow to avoid breaking UX; admin can reconcile via webhook later
  }
}

/* ---------- Public API used by your routes ---------- */
export async function readOrders(): Promise<OrderRow[]> {
  if (hasDB) return readOrdersDb();
  return readOrdersJson();
}

export async function appendOrder(row: OrderRow) {
  if (hasDB) return appendOrderDb(row);
  return appendOrderJson(row);
}

export function getOrdersLocationNote() {
  return hasDB
    ? "Vercel Postgres (persistent)"
    : ".data/orders.json (dev, local file)";
}
