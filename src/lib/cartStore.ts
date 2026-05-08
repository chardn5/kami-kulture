'use client';
import { create } from 'zustand';

export type CartItem = {
  sku: string;
  title: string;
  price: number;      // cents or PHP minor units if you prefer
  image?: string;
  size?: string;
  color?: string;
  printifyProductId?: string;
  printifyVariantId?: number;
  qty: number;
};

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (sku: string, size?: string, color?: string) => void;
  setQty: (sku: string, size: string | undefined, color: string | undefined, qty: number) => void;
  clear: () => void;
};

const STORAGE_KEY = 'kk_cart_v1';

const load = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};
const save = (items: CartItem[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const useCart = create<CartState>((set, get) => ({
  items: load(),
  add: (item) => {
    const items = [...get().items];
    const idx = items.findIndex(i => i.sku === item.sku && i.size === item.size && i.color === item.color);
    if (idx >= 0) items[idx] = { ...items[idx], qty: items[idx].qty + item.qty };
    else items.push(item);
    save(items); set({ items });
  },
  remove: (sku, size, color) => {
    const items = get().items.filter(i => !(i.sku === sku && i.size === size && i.color === color));
    save(items); set({ items });
  },
  setQty: (sku, size, color, qty) => {
    const items = get().items.map(i => (
      i.sku === sku && i.size === size && i.color === color ? { ...i, qty } : i
    ));
    save(items); set({ items });
  },
  clear: () => { save([]); set({ items: [] }); },
}));
