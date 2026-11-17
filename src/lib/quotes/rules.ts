// B2B / office quotes — TASK-NEXT-009a. Pure rules shared by the request form,
// admin pricing and conversion to an order. Integer minor units.
//
// requested → priced (admin prices every line, sets validity) → accepted (shopper,
// before valid_until) → converted (order created). Any open quote can be declined;
// a priced quote past valid_until is expired.

export type QuoteStatus = "requested" | "priced" | "accepted" | "converted" | "declined" | "expired";

const NEXT: Record<QuoteStatus, QuoteStatus[]> = {
  requested: ["priced", "declined"],
  priced: ["priced", "accepted", "declined", "expired"], // re-pricing allowed
  accepted: ["converted", "declined"],
  converted: [],
  declined: [],
  expired: ["priced"], // admin can re-issue
};

export function canQuoteTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return NEXT[from].includes(to);
}

export const QUOTE_MIN_UNITS = 1;
export const QUOTE_MAX_LINES = 100;
export const QUOTE_DEFAULT_VALID_DAYS = 14;

export interface QuoteLine {
  qty: number;
  list_unit_minor: number;
  quoted_unit_minor: number | null;
}

export interface QuoteTotals {
  subtotal_minor: number;
  list_subtotal_minor: number;
  savings_minor: number;
  total_minor: number;
}

/** Totals using quoted prices (list price where a line is not yet quoted). */
export function quoteTotals(lines: QuoteLine[], shippingMinor = 0): QuoteTotals {
  let subtotal = 0;
  let list = 0;
  for (const l of lines) {
    list += l.qty * l.list_unit_minor;
    subtotal += l.qty * (l.quoted_unit_minor ?? l.list_unit_minor);
  }
  return {
    subtotal_minor: subtotal,
    list_subtotal_minor: list,
    savings_minor: Math.max(0, list - subtotal),
    total_minor: subtotal + Math.max(0, shippingMinor),
  };
}

export type QuoteCheck = { ok: true } | { ok: false; reason: string };

/** Admin may send a quote only once every line has a valid quoted price. */
export function canSendQuote(lines: QuoteLine[]): QuoteCheck {
  if (lines.length === 0) return { ok: false, reason: "Quote has no items" };
  const bad = lines.findIndex((l) => l.quoted_unit_minor == null || !Number.isInteger(l.quoted_unit_minor) || l.quoted_unit_minor < 0);
  if (bad >= 0) return { ok: false, reason: `Line ${bad + 1} has no price` };
  return { ok: true };
}

/** Shopper can accept a priced quote that hasn't passed valid_until. */
export function canAcceptQuote(q: { status: QuoteStatus; valid_until: string | Date | null }, now: Date = new Date()): QuoteCheck {
  if (q.status !== "priced") return { ok: false, reason: "This quote can't be accepted" };
  if (isQuoteExpired(q, now)) return { ok: false, reason: "This quote has expired" };
  return { ok: true };
}

export function isQuoteExpired(q: { status: QuoteStatus; valid_until: string | Date | null }, now: Date = new Date()): boolean {
  return q.status === "priced" && q.valid_until != null && new Date(q.valid_until).getTime() <= now.getTime();
}

export function validUntil(from: Date, days = QUOTE_DEFAULT_VALID_DAYS): Date {
  return new Date(from.getTime() + days * 86_400_000);
}

/** Human quote number, e.g. Q-20261117-4F2A. `rand` is injectable for tests. */
export function quoteNumber(at: Date, rand: string): string {
  const ymd = at.toISOString().slice(0, 10).replace(/-/g, "");
  return `Q-${ymd}-${rand.toUpperCase().slice(0, 4)}`;
}

export const QUOTE_MAX_QTY = 10_000;

export interface QuoteSourceLine {
  variant_id: string;
  product_name: string;
  variant_name: string | null;
  sku: string;
  unit_price_minor: number;
  quantity: number;
}

export interface QuoteItemDraft {
  variant_id: string;
  name: string;
  sku: string;
  qty: number;
  list_unit_minor: number;
  quoted_unit_minor: null;
}

/**
 * Snapshot cart lines into quote items. `qtys` lets the buyer ask for more than
 * is in stock (bulk orders); only variants already in the cart are honoured and
 * quantities are clamped to 1..QUOTE_MAX_QTY. A qty of 0 drops the line.
 */
export function buildQuoteItems(lines: QuoteSourceLine[], qtys: Record<string, number> = {}): QuoteItemDraft[] {
  const out: QuoteItemDraft[] = [];
  for (const l of lines.slice(0, QUOTE_MAX_LINES)) {
    const raw = l.variant_id in qtys ? qtys[l.variant_id] : l.quantity;
    const qty = Math.min(QUOTE_MAX_QTY, Math.floor(Number(raw) || 0));
    if (qty < QUOTE_MIN_UNITS) continue;
    out.push({
      variant_id: l.variant_id,
      name: l.variant_name ? `${l.product_name} — ${l.variant_name}` : l.product_name,
      sku: l.sku,
      qty,
      list_unit_minor: l.unit_price_minor,
      quoted_unit_minor: null,
    });
  }
  return out;
}

/** Access tokens are 64 lowercase hex chars (see 0022). Reject anything else before querying. */
export function isQuoteToken(t: string): boolean {
  return /^[0-9a-f]{64}$/.test(t);
}
