"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Minus, Plus, ShoppingBag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/cart-provider";
import { formatMoney } from "@/lib/pricing/money";
import type { ProductVariant, Inventory } from "@/lib/types";

type V = ProductVariant & { inventory: Inventory | null };

export function PdpBuy({ variants, currency }: { variants: V[]; currency: string }) {
  const cart = useCart();
  const active = variants.filter((v) => v.is_active);
  const [selected, setSelected] = useState<V>(active[0]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const available = Math.max((selected?.inventory?.on_hand ?? 0) - (selected?.inventory?.reserved ?? 0), 0);
  const onSale = selected?.compare_at_minor != null && selected.compare_at_minor > selected.price_minor;

  async function add() {
    const res = await cart.add(selected.id, qty);
    if (res.ok) { setAdded(true); setTimeout(() => setAdded(false), 1600); }
  }

  if (!selected) return <p className="text-ink-soft">Unavailable.</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-3xl font-semibold">{formatMoney(selected.price_minor, currency)}</span>
        {onSale && <span className="text-lg text-ink-soft line-through">{formatMoney(selected.compare_at_minor!, currency)}</span>}
      </div>

      {active.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-medium">Option</p>
          <div className="flex flex-wrap gap-2">
            {active.map((v) => (
              <button key={v.id} onClick={() => { setSelected(v); setQty(1); }}
                className={`rounded-full border px-4 py-2 text-sm ${selected.id === v.id ? "border-brand bg-brand text-paper" : "border-line hover:border-ink"}`}>
                {v.name ?? v.sku}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-sm">
        {available > 0 ? (
          available <= 5 ? <span className="text-gold font-medium">Only {available} left in stock</span> : <span className="text-mint font-medium">In stock</span>
        ) : <span className="text-ink-soft">Out of stock</span>}
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border border-line">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-11 w-11 place-items-center"><Minus className="h-4 w-4" /></button>
          <span className="w-8 text-center">{qty}</span>
          <button onClick={() => setQty((q) => Math.min(available, q + 1))} disabled={qty >= available} className="grid h-11 w-11 place-items-center disabled:opacity-40"><Plus className="h-4 w-4" /></button>
        </div>
        <Button size="lg" className="flex-1" variant="accent" onClick={add} disabled={available <= 0 || cart.adding}>
          <motion.span key={added ? "added" : "add"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
            {added ? <><Check className="h-5 w-5" /> Added</> : <><ShoppingBag className="h-5 w-5" /> Add to cart</>}
          </motion.span>
        </Button>
      </div>
    </div>
  );
}
