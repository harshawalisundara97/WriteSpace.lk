"use client";

import { createContext, useCallback, useContext, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { addToCart as addToCartAction, getCartCount } from "@/lib/cart/actions";

interface CartCtx {
  count: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  adding: boolean;
  add: (variantId: string, qty?: number) => Promise<{ ok: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children, initialCount }: { children: ReactNode; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [isOpen, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    setCount(await getCartCount());
  }, []);

  const add = useCallback(async (variantId: string, qty = 1) => {
    const res = await addToCartAction(variantId, qty);
    if (res.ok) {
      if (typeof res.count === "number") setCount(res.count);
      setOpen(true);
    }
    return res;
  }, []);

  return (
    <Ctx.Provider
      value={{
        count,
        isOpen,
        open: () => setOpen(true),
        close: () => setOpen(false),
        adding: pending,
        add: (v, q) => new Promise((resolve) => startTransition(async () => resolve(await add(v, q)))),
        refresh,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
