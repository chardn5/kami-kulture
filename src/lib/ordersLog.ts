// /src/lib/ordersLog.ts
import { promises as fs } from 'fs';
import path from 'path';

const filePath =
  process.env.NODE_ENV === 'production'
    ? '/tmp/orders.json'
    : path.join(process.cwd(), '.data', 'orders.json');

export type OrderLogEntry = {
  ts: number;
  orderId: string;
  amount: number;
  currency: string;
  payerEmail: string | null;
  customId: string | null;
};

export async function appendOrder(entry: OrderLogEntry) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const list = await readOrders();
  list.unshift(entry);
  // keep most recent 200
  const trimmed = list.slice(0, 200);
  await fs.writeFile(filePath, JSON.stringify(trimmed, null, 2), 'utf8');
}

export async function readOrders(): Promise<OrderLogEntry[]> {
  try {
    const txt = await fs.readFile(filePath, 'utf8');
    return JSON.parse(txt) as OrderLogEntry[];
  } catch {
    return [];
  }
}
