"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { addToWishlist, removeFromWishlist, syncWishlist } from "@/lib/account/wishlist";

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

export function WishlistProvider({
  serverItems = [],
  persist = false,
  children,
}: {
  serverItems?: WishlistItem[];
  persist?: boolean;
  children: ReactNode;
}) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [ready, setReady] = useState(false);

  // Hydrate once: merge server (authoritative, cross-device) with local storage.
  useEffect(() => {
    let local: WishlistItem[] = [];
    try { local = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch {}
    const map = new Map<string, WishlistItem>();
    for (const it of serverItems) map.set(it.productId, it);
    for (const it of local) if (!map.has(it.productId)) map.set(it.productId, it);
    setItems([...map.values()]);
    setReady(true);
    // Push any items saved before sign-in up to the account.
    if (persist) {
      const localOnly = local.filter((it) => !serverItems.some((s) => s.productId === it.productId)).map((it) => it.productId);
      if (localOnly.length) void syncWishlist(localOnly);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready) try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items, ready]);

  const has = useCallback((productId: string) => items.some((i) => i.productId === productId), [items]);

  const remove = useCallback((productId: string) => {
    setItems((s) => s.filter((i) => i.productId !== productId));
    if (persist) void removeFromWishlist(productId);
  }, [persist]);

  const toggle = useCallback((item: WishlistItem) => {
    setItems((s) => {
      const exists = s.some((i) => i.productId === item.productId);
      if (persist) void (exists ? removeFromWishlist(item.productId) : addToWishlist(item.productId));
      return exists ? s.filter((i) => i.productId !== item.productId) : [item, ...s];
    });
  }, [persist]);

  return <Ctx.Provider value={{ items, count: items.length, has, toggle, remove }}>{children}</Ctx.Provider>;
}

export function useWishlist() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
