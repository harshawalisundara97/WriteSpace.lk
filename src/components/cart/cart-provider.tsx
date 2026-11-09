"use client";

import { createContext, useCallback, useContext, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { addToCart as addToCartAction, getCartCount } from "@/lib/cart/actions";

interface Point { x: number; y: number }
interface Flight { id: number; from: Point; to: Point }

interface CartCtx {
  count: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  adding: boolean;
  add: (variantId: string, qty?: number, opts?: { open?: boolean }) => Promise<{ ok: boolean; error?: string }>;
  fly: (from: Point) => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<CartCtx | null>(null);
let seq = 0;

export function CartProvider({ children, initialCount }: { children: ReactNode; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [isOpen, setOpen] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    setCount(await getCartCount());
  }, []);

  const fly = useCallback((from: Point) => {
    if (typeof document === "undefined") return;
    const target = document.querySelector("[data-cart-icon]")?.getBoundingClientRect();
    if (!target) return;
    const to = { x: target.left + target.width / 2, y: target.top + target.height / 2 };
    const id = ++seq;
    setFlights((f) => [...f, { id, from, to }]);
    setTimeout(() => setFlights((f) => f.filter((x) => x.id !== id)), 750);
  }, []);

  const add = useCallback(async (variantId: string, qty = 1, opts?: { open?: boolean }) => {
    const res = await addToCartAction(variantId, qty);
    if (res.ok) {
      if (typeof res.count === "number") setCount(res.count);
      if (opts?.open ?? true) setOpen(true);
    }
    return res;
  }, []);

  return (
    <Ctx.Provider
      value={{
        count, isOpen,
        open: () => setOpen(true),
        close: () => setOpen(false),
        adding: pending,
        add: (v, q, o) => new Promise((resolve) => startTransition(async () => resolve(await add(v, q, o)))),
        fly,
        refresh,
      }}
    >
      {children}
      {/* fly-to-cart dots */}
      <div className="pointer-events-none fixed inset-0 z-[70]">
        <AnimatePresence>
          {flights.map((f) => (
            <motion.span
              key={f.id}
              initial={{ x: f.from.x - 8, y: f.from.y - 8, scale: 1, opacity: 1 }}
              animate={{ x: f.to.x - 8, y: f.to.y - 8, scale: 0.3, opacity: 0.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
              className="absolute left-0 top-0 h-4 w-4 rounded-full bg-accent shadow-lift"
            />
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
