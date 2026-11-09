"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export interface WishlistItem {
  productId: string;
  slug: string;
  name: string;
  brand: string | null;
  variantId: string | null;
  price_minor: number;
  compare_at_minor: number | null;
  currency: string;
  imageUrl: string | null;
}

interface WishlistCtx {
  items: WishlistItem[];
  count: number;
  has: (productId: string) => boolean;
  toggle: (item: WishlistItem) => void;
  remove: (productId: string) => void;
}

const Ctx = createContext<WishlistCtx | null>(null);
const KEY = "ws_wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items, ready]);

  const has = useCallback((productId: string) => items.some((i) => i.productId === productId), [items]);
  const remove = useCallback((productId: string) => setItems((s) => s.filter((i) => i.productId !== productId)), []);
  const toggle = useCallback((item: WishlistItem) => {
    setItems((s) => (s.some((i) => i.productId === item.productId) ? s.filter((i) => i.productId !== item.productId) : [item, ...s]));
  }, []);

  return <Ctx.Provider value={{ items, count: items.length, has, toggle, remove }}>{children}</Ctx.Provider>;
}

export function useWishlist() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
