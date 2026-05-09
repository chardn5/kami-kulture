'use client';
import { useEffect } from 'react';
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
  hasHydrated: boolean;
  hydrate: () => void;
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
  items: [],
  hasHydrated: false,
  hydrate: () => {
    if (get().hasHydrated) return;
    set({ items: load(), hasHydrated: true });
  },
  add: (item) => {
    const current = get().hasHydrated ? get().items : load();
    const items = [...current];
    const idx = items.findIndex(i => i.sku === item.sku && i.size === item.size && i.color === item.color);
    if (idx >= 0) items[idx] = { ...items[idx], qty: items[idx].qty + item.qty };
    else items.push(item);
    save(items); set({ items, hasHydrated: true });
  },
  remove: (sku, size, color) => {
    const current = get().hasHydrated ? get().items : load();
    const items = current.filter(i => !(i.sku === sku && i.size === size && i.color === color));
    save(items); set({ items, hasHydrated: true });
  },
  setQty: (sku, size, color, qty) => {
    const current = get().hasHydrated ? get().items : load();
    const items = current.map(i => (
      i.sku === sku && i.size === size && i.color === color ? { ...i, qty } : i
    ));
    save(items); set({ items, hasHydrated: true });
  },
  clear: () => { save([]); set({ items: [], hasHydrated: true }); },
}));

export function useHydrateCart() {
  const hydrate = useCart((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);
}
