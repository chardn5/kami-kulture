// src/lib/orderStore.ts
import fs from "fs/promises";
import path from "path";

export type OrderRow = {
  time: string;          // ISO
  orderId: string;
  amount: string;        // "29.99"
  currency?: string;     // "USD"
  email?: string;
  customId?: string;     // e.g. sku|size|slug
};

function ordersPath() {
  const isProd = !!process.env.VERCEL;
  return isProd ? "/tmp/orders.json" : path.join(process.cwd(), ".data", "orders.json");
}

async function ensureDirExists(p: string) {
  const dir = path.dirname(p);
  await fs.mkdir(dir, { recursive: true }).catch(() => {});
}

export async function readOrders(): Promise<OrderRow[]> {
  const file = ordersPath();
  try {
    const buf = await fs.readFile(file, "utf8");
    const arr = JSON.parse(buf);
    return Array.isArray(arr) ? arr as OrderRow[] : [];
  } catch {
    return [];
  }
}

export async function appendOrder(row: OrderRow) {
  const file = ordersPath();
  await ensureDirExists(file);
  const current = await readOrders();
  current.unshift(row); // newest first
  await fs.writeFile(file, JSON.stringify(current, null, 2), "utf8");
}

export function getOrdersLocationNote() {
  return process.env.VERCEL ? "/tmp/orders.json (prod, ephemeral)" : ".data/orders.json (dev)";
}
