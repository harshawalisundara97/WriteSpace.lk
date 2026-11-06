// Pure promotion engine. No I/O. Deterministic. Unit-tested.
// All monetary values are integer minor units.

import type { CartLine, Promotion } from "@/lib/types";
import { applyPercent, sumMinor, clampMinor } from "./money";

export interface PromoContext {
  now?: Date;
  /** How many times THIS customer has already redeemed each promo id. */
  customerRedemptions?: Record<string, number>;
  /** Global redemption counts per promo id. */
  globalRedemptions?: Record<string, number>;
}

export interface AppliedPromo {
  promotion_id: string;
  name: string;
  code: string | null;
  discount_minor: number;
  free_shipping: boolean;
}

export interface PromoResult {
  subtotal_minor: number;
  discount_minor: number;
  free_shipping: boolean;
  applied: AppliedPromo[];
}

function isLive(p: Promotion, now: Date): boolean {
  if (!p.is_active) return false;
  if (p.starts_at && new Date(p.starts_at) > now) return false;
  if (p.ends_at && new Date(p.ends_at) < now) return false;
  return true;
}

function withinLimits(p: Promotion, ctx: PromoContext): boolean {
  const global = ctx.globalRedemptions?.[p.id] ?? 0;
  if (p.usage_limit != null && global >= p.usage_limit) return false;
  const per = ctx.customerRedemptions?.[p.id] ?? 0;
  if (p.per_customer_limit != null && per >= p.per_customer_limit) return false;
  return true;
}

function subtotalOf(lines: CartLine[]): number {
  return sumMinor(lines.map((l) => l.unit_price_minor * l.quantity));
}

/** Discount a single promotion would produce against the current subtotal. */
function discountFor(p: Promotion, lines: CartLine[], subtotal: number): { discount: number; freeShip: boolean } {
  if (subtotal < p.min_subtotal_minor) return { discount: 0, freeShip: false };

  switch (p.type) {
    case "percentage":
      return { discount: applyPercent(subtotal, p.value), freeShip: false };
    case "fixed":
      return { discount: clampMinor(Math.min(p.value, subtotal)), freeShip: false };
    case "free_shipping":
      return { discount: 0, freeShip: true };
    case "bxgy": {
      // meta: { buy_qty, get_qty }. Cheapest eligible units become free,
      // grouped by the configured ratio across all lines (simple global variant).
      const buy = Number(p.meta?.buy_qty ?? 0);
      const get = Number(p.meta?.get_qty ?? 0);
      if (buy <= 0 || get <= 0) return { discount: 0, freeShip: false };
      const units: number[] = [];
      for (const l of lines) for (let i = 0; i < l.quantity; i++) units.push(l.unit_price_minor);
      units.sort((a, b) => a - b); // cheapest first become free
      const groupSize = buy + get;
      const freeCount = Math.floor(units.length / groupSize) * get;
      const discount = sumMinor(units.slice(0, freeCount));
      return { discount, freeShip: false };
    }
    default:
      return { discount: 0, freeShip: false };
  }
}

/**
 * Apply promotions to a cart.
 * - `enteredCode` restricts coupon-type promos to the one matching that code.
 * - Non-stackable: the single best promo wins. Stackable promos always combine.
 * - Discount never exceeds subtotal.
 */
export function applyPromotions(
  lines: CartLine[],
  promotions: Promotion[],
  enteredCode?: string | null,
  ctx: PromoContext = {},
): PromoResult {
  const now = ctx.now ?? new Date();
  const subtotal = subtotalOf(lines);

  const eligible = promotions.filter((p) => {
    if (!isLive(p, now)) return false;
    if (!withinLimits(p, ctx)) return false;
    // Coupon promos require the matching entered code.
    if (p.code) return enteredCode?.trim().toUpperCase() === p.code.toUpperCase();
    return true; // automatic
  });

  const stackable = eligible.filter((p) => p.stackable).sort((a, b) => b.priority - a.priority);
  const exclusive = eligible.filter((p) => !p.stackable);

  const applied: AppliedPromo[] = [];
  let discount = 0;
  let freeShip = false;

  // Stackable promos combine; recompute remaining subtotal as we go.
  for (const p of stackable) {
    const remaining = clampMinor(subtotal - discount);
    const r = discountFor(p, lines, remaining);
    if (r.discount > 0 || r.freeShip) {
      discount += r.discount;
      freeShip = freeShip || r.freeShip;
      applied.push({ promotion_id: p.id, name: p.name, code: p.code, discount_minor: r.discount, free_shipping: r.freeShip });
    }
  }

  // Best single exclusive promo (compared on the subtotal net of stackables).
  let best: { p: Promotion; discount: number; freeShip: boolean } | null = null;
  const base = clampMinor(subtotal - discount);
  for (const p of exclusive) {
    const r = discountFor(p, lines, base);
    const value = r.discount; // free_shipping compared below
    if (!best || value > best.discount) best = { p, discount: r.discount, freeShip: r.freeShip };
  }
  if (best && (best.discount > 0 || best.freeShip)) {
    discount += best.discount;
    freeShip = freeShip || best.freeShip;
    applied.push({ promotion_id: best.p.id, name: best.p.name, code: best.p.code, discount_minor: best.discount, free_shipping: best.freeShip });
  }

  discount = Math.min(discount, subtotal);
  return { subtotal_minor: subtotal, discount_minor: discount, free_shipping: freeShip, applied };
}
