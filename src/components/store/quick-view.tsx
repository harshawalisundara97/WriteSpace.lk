"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { X, ShoppingBag, Check, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/cart-provider";
import { formatMoney } from "@/lib/pricing/money";
import { variantColor } from "@/lib/catalog/variant-color";
import { cn } from "@/lib/utils";
import type { ProductWithVariants, ProductVariant, Inventory } from "@/lib/types";

type V = ProductVariant & { inventory: Inventory | null };

interface QuickViewCtx {
  product: ProductWithVariants | null;
  open: (p: ProductWithVariants) => void;
  close: () => void;
}
const Ctx = createContext<QuickViewCtx | null>(null);

export function QuickViewProvider({ children }: { children: ReactNode }) {
  const [product, setProduct] = useState<ProductWithVariants | null>(null);
  return (
    <Ctx.Provider value={{ product, open: setProduct, close: () => setProduct(null) }}>
      {children}
      <QuickViewModal />
    </Ctx.Provider>
  );
}

export function useQuickView() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useQuickView must be used within QuickViewProvider");
  return ctx;
}

function QuickViewModal() {
  const { product, close } = useQuickView();
  return (
    <AnimatePresence>
      {product && <Inner key={product.id} product={product} onClose={close} />}
    </AnimatePresence>
  );
}

function Inner({ product, onClose }: { product: ProductWithVariants; onClose: () => void }) {
  const cart = useCart();
  const active = (product.product_variants ?? []).filter((v) => v.is_active);
  const [selected, setSelected] = useState<V>(active[0]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const available = Math.max((selected?.inventory?.on_hand ?? 0) - (selected?.inventory?.reserved ?? 0), 0);
  const onSale = selected?.compare_at_minor != null && selected.compare_at_minor > selected.price_minor;
  const currency = selected?.currency ?? "LKR";
  const img = product.images?.[0];
  const hasColors = active.some((v) => variantColor(v.name, v.options));

  async function add() {
    if (!selected) return;
    const res = await cart.add(selected.id, qty);
    if (res.ok) { setAdded(true); setTimeout(() => setAdded(false), 1400); }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative grid w-full max-w-3xl gap-6 overflow-hidden rounded-2xl bg-paper p-5 shadow-lift sm:grid-cols-2 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button aria-label="Close" onClick={onClose} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-paper-2 hover:bg-line"><X className="h-5 w-5" /></button>

        <div className="aspect-square overflow-hidden rounded-xl border border-line bg-gradient-to-br from-paper-2 to-[#e8ded0]"
          style={img ? { backgroundImage: `url(${img.url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
          {!img && <span className="grid h-full place-items-center font-display text-6xl text-ink/20">{product.name.charAt(0)}</span>}
        </div>

        <div className="flex flex-col">
          {product.brand && <p className="text-xs uppercase tracking-wide text-ink-soft">{product.brand}</p>}
          <h2 className="mt-1 font-display text-2xl font-semibold">{product.name}</h2>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold">{formatMoney(selected?.price_minor ?? 0, currency)}</span>
            {onSale && <span className="text-sm text-ink-soft line-through">{formatMoney(selected.compare_at_minor!, currency)}</span>}
          </div>
          {product.description && <p className="mt-3 line-clamp-3 text-sm text-ink-soft">{product.description}</p>}

          {active.length > 1 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium">{hasColors ? "Colour" : "Option"}</p>
              <div className="flex flex-wrap gap-2">
                {active.map((v) => {
                  const col = variantColor(v.name, v.options);
                  const isSel = selected?.id === v.id;
                  return col ? (
                    <button key={v.id} onClick={() => { setSelected(v); setQty(1); }} aria-label={v.name ?? v.sku}
                      className={cn("grid h-8 w-8 place-items-center rounded-full border-2", isSel ? "border-brand" : "border-line")}>
                      <span className="h-5 w-5 rounded-full" style={{ background: col }} />
                    </button>
                  ) : (
                    <button key={v.id} onClick={() => { setSelected(v); setQty(1); }}
                      className={cn("rounded-full border px-3 py-1.5 text-sm", isSel ? "border-brand bg-brand text-paper" : "border-line")}>
                      {v.name ?? v.sku}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <p className="mt-3 text-sm">
            {available > 0 ? (available <= 5 ? <span className="font-medium text-gold">Only {available} left</span> : <span className="font-medium text-mint">In stock</span>) : <span className="text-ink-soft">Out of stock</span>}
          </p>

          <div className="mt-auto flex items-center gap-3 pt-4">
            <div className="flex items-center rounded-full border border-line">
              <button aria-label="Decrease" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-10 w-10 place-items-center"><Minus className="h-4 w-4" /></button>
              <span className="w-7 text-center tabular-nums">{qty}</span>
              <button aria-label="Increase" onClick={() => setQty((q) => Math.min(available, q + 1))} disabled={qty >= available} className="grid h-10 w-10 place-items-center disabled:opacity-40"><Plus className="h-4 w-4" /></button>
            </div>
            <Button variant="accent" className="flex-1" onClick={add} disabled={available <= 0 || cart.adding}>
              {added ? <><Check className="h-5 w-5" /> Added</> : <><ShoppingBag className="h-5 w-5" /> Add to cart</>}
            </Button>
          </div>
          <Link href={`/products/${product.slug}`} onClick={onClose} className="mt-3 text-center text-sm text-accent hover:underline">View full details →</Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
