// Bulk-order price tiers (TASK-008). Per-product quantity breakpoints, each a
// percentage discount (basis points) off the variant's unit price. Stored on
// products.price_tiers (jsonb array). Single source of truth for normalization,
// tier selection, effective unit price and display — used by the PDP, the cart
// (server-enforced unit price) and the admin product form.
//
// Money is integer minor units; discounts are basis points (1% = 100 bps),
// matching tax_rate_bps used elsewhere. Tiers apply across a product's variants
// as a percentage off each variant's own base price, so they work even when
// variants have different base prices.

import { applyPercent, clampMinor } from "@/lib/pricing/money";

export interface PriceTier {
  min_qty: number; // tier applies when line qty >= min_qty (min 2)
  discount_bps: number; // percentage off in basis points (1–10000)
}

const MAX_BPS = 10000;

// Coerce raw input into valid tiers: drop invalid rows (min_qty < 2, or bps out
// of 1..10000), sort by min_qty ascending, dedupe by min_qty (last wins).
export function normalizeTiers(raw: unknown): PriceTier[] {
  if (!Array.isArray(raw)) return [];
  const byQty = new Map<number, number>();
  for (const t of raw) {
    if (!t || typeof t !== "object") continue;
    const min = Math.trunc(Number((t as PriceTier).min_qty));
    const bps = Math.trunc(Number((t as PriceTier).discount_bps));
    if (!Number.isFinite(min) || !Number.isFinite(bps)) continue;
    if (min < 2 || bps <= 0 || bps > MAX_BPS) continue;
    byQty.set(min, bps); // later entries overwrite earlier ones at the same qty
  }
  return [...byQty.entries()]
    .map(([min_qty, discount_bps]) => ({ min_qty, discount_bps }))
    .sort((a, b) => a.min_qty - b.min_qty);
}

export function hasTiers(tiers: PriceTier[] | null | undefined): boolean {
  return Array.isArray(tiers) && tiers.length > 0;
}

// Highest tier whose min_qty <= qty, or null. Expects normalized (sorted) tiers.
export function tierForQty(tiers: PriceTier[] | null | undefined, qty: number): PriceTier | null {
  if (!tiers) return null;
  let best: PriceTier | null = null;
  for (const t of tiers) {
    if (qty >= t.min_qty) best = t;
    else break;
  }
  return best;
}

// Effective per-unit price for a quantity after the active tier's discount.
// Clamped at zero; no tier (or no match) returns the base price unchanged.
export function tierUnitPrice(baseMinor: number, qty: number, tiers: PriceTier[] | null | undefined): number {
  const t = tierForQty(tiers, qty);
  if (!t) return baseMinor;
  return clampMinor(baseMinor - applyPercent(baseMinor, t.discount_bps / 100));
}

export interface TierRow {
  min_qty: number;
  discount_bps: number;
  pct: number; // discount_bps / 100, for display
  unit_minor: number; // effective unit price at this tier, off baseMinor
}

// Display-ready rows for the PDP tier table, computed off a given base unit
// price. Normalizes first so callers can pass raw tiers.
export function tierRows(baseMinor: number, tiers: PriceTier[] | null | undefined): TierRow[] {
  return normalizeTiers(tiers).map((t) => ({
    min_qty: t.min_qty,
    discount_bps: t.discount_bps,
    pct: t.discount_bps / 100,
    unit_minor: clampMinor(baseMinor - applyPercent(baseMinor, t.discount_bps / 100)),
  }));
}
