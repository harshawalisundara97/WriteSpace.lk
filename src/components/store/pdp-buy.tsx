"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Minus, Plus, ShoppingBag, Check, Truck, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/cart-provider";
import { formatMoney } from "@/lib/pricing/money";
import { cn } from "@/lib/utils";
import type { ProductVariant, Inventory, PriceTier } from "@/lib/types";
import { tierForQty, tierUnitPrice, tierRows, hasTiers } from "@/lib/catalog/pricing-tiers";

type V = ProductVariant & { inventory: Inventory | null };

const COLOR_HEX: Record<string, string> = {
  black: "#1c1a2e", white: "#f3f0ea", teal: "#2fb3a0", blue: "#3b6fe0", red: "#e8533f",
  green: "#3ba55d", yellow: "#f4c13a", pink: "#ef7bb0", purple: "#8b5cf6", orange: "#f49a3a",
  natural: "#c9b18a", bamboo: "#c9b18a", grey: "#9a97a8", gray: "#9a97a8", brown: "#8a5a3c",
};

function colorOf(v: V): string | null {
  const hay = `${v.name ?? ""} ${Object.values(v.options ?? {}).join(" ")}`.toLowerCase();
  for (const key of Object.keys(COLOR_HEX)) if (hay.includes(key)) return COLOR_HEX[key];
  return null;
}

function deliveryWindow(): string {
  const fmt = (d: Date) => d.toLocaleDateString("en-LK", { weekday: "short", day: "numeric", month: "short" });
  const a = new Date(Date.now() + 2 * 86400_000);
  const b = new Date(Date.now() + 4 * 86400_000);
  return `${fmt(a)} – ${fmt(b)}`;
}

export function PdpBuy({ variants, currency, tiers = [] }: { variants: V[]; currency: string; tiers?: PriceTier[] }) {
  const cart = useCart();
  const active = variants.filter((v) => v.is_active);
  const [selected, setSelected] = useState<V>(active[0]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const available = Math.max((selected?.inventory?.on_hand ?? 0) - (selected?.inventory?.reserved ?? 0), 0);
  const onSale = selected?.compare_at_minor != null && selected.compare_at_minor > selected.price_minor;
  const pctOff = onSale ? Math.round((1 - selected.price_minor / selected.compare_at_minor!) * 100) : 0;
  const hasColors = active.some((v) => colorOf(v));
  const rows = tierRows(selected?.price_minor ?? 0, tiers);
  const activeTier = tierForQty(tiers, qty);
  const effUnit = tierUnitPrice(selected?.price_minor ?? 0, qty, tiers);

  async function add(e: React.MouseEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    cart.fly({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    const res = await cart.add(selected.id, qty);
    if (res.ok) { setAdded(true); setTimeout(() => setAdded(false), 1600); }
  }

  if (!selected) return <p className="text-ink-soft">Unavailable.</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-display text-3xl font-semibold">{formatMoney(selected.price_minor, currency)}</span>
        {onSale && <span className="text-lg text-ink-soft line-through">{formatMoney(selected.compare_at_minor!, currency)}</span>}
        {onSale && <span className="rounded-full bg-accent/15 px-2.5 py-1 text-sm font-semibold text-accent">Save {pctOff}%</span>}
      </div>

      {active.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-medium">{hasColors ? "Colour" : "Option"}</p>
          <div className="flex flex-wrap gap-2">
            {active.map((v) => {
              const col = colorOf(v);
              const isSel = selected.id === v.id;
              return col ? (
                <button key={v.id} onClick={() => { setSelected(v); setQty(1); }} title={v.name ?? v.sku}
                  aria-label={v.name ?? v.sku}
                  className={cn("grid h-9 w-9 place-items-center rounded-full border-2 transition-transform", isSel ? "border-brand scale-110" : "border-line hover:scale-105")}>
                  <span className="h-6 w-6 rounded-full" style={{ background: col }} />
                </button>
              ) : (
                <button key={v.id} onClick={() => { setSelected(v); setQty(1); }}
                  className={cn("rounded-full border px-4 py-2 text-sm", isSel ? "border-brand bg-brand text-paper" : "border-line hover:border-ink")}>
                  {v.name ?? v.sku}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-sm">
        {available > 0 ? (
          available <= 5 ? <span className="font-medium text-gold">Hurry — only {available} left in stock</span> : <span className="font-medium text-mint">In stock, ready to ship</span>
        ) : <span className="text-ink-soft">Out of stock</span>}
      </p>

      {hasTiers(tiers) && (
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="flex items-center justify-between bg-paper-2 px-4 py-2.5 text-sm">
            <span className="font-medium">Buy more, save more</span>
            {activeTier && <span className="font-semibold text-mint">You pay {formatMoney(effUnit, currency)} each</span>}
          </div>
          <table className="w-full text-sm">
            <tbody>
              <tr className={cn("border-t border-line", !activeTier && "bg-accent/10 font-semibold")}>
                <td className="px-4 py-2">1+</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatMoney(selected.price_minor, currency)} each</td>
                <td className="px-4 py-2 text-right text-ink-soft">—</td>
              </tr>
              {rows.map((r) => {
                const on = activeTier?.min_qty === r.min_qty;
                return (
                  <tr key={r.min_qty} className={cn("border-t border-line", on && "bg-accent/10 font-semibold")}>
                    <td className="px-4 py-2">{r.min_qty}+</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatMoney(r.unit_minor, currency)} each</td>
                    <td className="px-4 py-2 text-right text-accent">Save {r.pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border border-line">
          <button aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-11 w-11 place-items-center"><Minus className="h-4 w-4" /></button>
          <input type="number" aria-label="Quantity" min={1} max={available} value={qty}
            onChange={(e) => { const n = parseInt(e.target.value, 10); setQty(Number.isFinite(n) ? Math.min(Math.max(1, n), available) : 1); }}
            className="w-14 bg-transparent text-center tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
          <button aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(available, q + 1))} disabled={qty >= available} className="grid h-11 w-11 place-items-center disabled:opacity-40"><Plus className="h-4 w-4" /></button>
        </div>
        <Button size="lg" className="flex-1" variant="accent" onClick={add} disabled={available <= 0 || cart.adding}>
          <motion.span key={added ? "added" : "add"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
            {added ? <><Check className="h-5 w-5" /> Added to cart</> : <><ShoppingBag className="h-5 w-5" /> Add to cart</>}
          </motion.span>
        </Button>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-paper-2 px-4 py-3 text-sm">
        <Truck className="h-4 w-4 text-brand" />
        <span>Get it <strong>{deliveryWindow()}</strong> to Colombo</span>
      </div>

      <ul className="grid grid-cols-3 gap-2 pt-1 text-center text-xs text-ink-soft">
        <li className="flex flex-col items-center gap-1"><ShieldCheck className="h-5 w-5 text-mint" /> Secure checkout</li>
        <li className="flex flex-col items-center gap-1"><RefreshCw className="h-5 w-5 text-mint" /> 7-day returns</li>
        <li className="flex flex-col items-center gap-1"><Truck className="h-5 w-5 text-mint" /> Island-wide delivery</li>
      </ul>
    </div>
  );
}
