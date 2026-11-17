// Loyalty points — TASK-NEXT-008a. Pure rules shared by checkout (server-trusted),
// the account page and admin. Integer minor units; points are integers.
//
// - Earn floor(merchandise_after_discount / earn_per_minor) points when an order is delivered.
// - Redeem: 1 pt = point_value_minor off, capped at max_redeem_pct of the subtotal.
// - Credits expire expiry_months after they were earned; debits consume oldest credits first.

export interface LoyaltySettings {
  loyalty_enabled: boolean;
  /** Minor units of spend per point earned (LKR 100 default). */
  loyalty_earn_per_minor: number;
  /** Discount per redeemed point in minor units (LKR 1 default). */
  loyalty_point_value_minor: number;
  /** Max share of the subtotal payable with points, 0–100. */
  loyalty_max_redeem_pct: number;
  /** Months until earned points expire; 0 = never. */
  loyalty_expiry_months: number;
}

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  loyalty_enabled: false,
  loyalty_earn_per_minor: 10000,
  loyalty_point_value_minor: 100,
  loyalty_max_redeem_pct: 50,
  loyalty_expiry_months: 12,
};

const int = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : undefined;

/** Normalise a raw store_settings row (missing / bad columns → defaults). */
export function toLoyaltySettings(row: Partial<Record<keyof LoyaltySettings, unknown>> | null | undefined): LoyaltySettings {
  const d = DEFAULT_LOYALTY_SETTINGS;
  return {
    loyalty_enabled: typeof row?.loyalty_enabled === "boolean" ? row.loyalty_enabled : d.loyalty_enabled,
    loyalty_earn_per_minor: int(row?.loyalty_earn_per_minor, 1, Number.MAX_SAFE_INTEGER) ?? d.loyalty_earn_per_minor,
    loyalty_point_value_minor: int(row?.loyalty_point_value_minor, 1, Number.MAX_SAFE_INTEGER) ?? d.loyalty_point_value_minor,
    loyalty_max_redeem_pct: int(row?.loyalty_max_redeem_pct, 0, 100) ?? d.loyalty_max_redeem_pct,
    loyalty_expiry_months: int(row?.loyalty_expiry_months, 0, 120) ?? d.loyalty_expiry_months,
  };
}

/** Points earned for an order's merchandise value (subtotal minus discounts, excl. shipping/fees). */
export function pointsEarned(s: LoyaltySettings, merchandiseMinor: number): number {
  if (!s.loyalty_enabled || merchandiseMinor <= 0) return 0;
  return Math.floor(merchandiseMinor / s.loyalty_earn_per_minor);
}

/** Expiry for a credit earned at `at` (null = never). Month-end safe (Jan 31 + 1mo → Feb 28/29). */
export function expiryFor(s: LoyaltySettings, at: Date): Date | null {
  if (s.loyalty_expiry_months === 0) return null;
  const d = new Date(at);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + s.loyalty_expiry_months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

export interface LedgerEntry {
  points: number;
  created_at: string | Date;
  expires_at?: string | Date | null;
}

/**
 * Spendable balance at `now`. Credits (points > 0) are consumed oldest-first by
 * debits (points < 0) in chronological order; whatever remains of an expired
 * credit is lost. Never negative.
 */
export function balanceAt(entries: LedgerEntry[], now: Date = new Date()): number {
  const t = (v: string | Date) => new Date(v).getTime();
  const sorted = [...entries].sort((a, b) => t(a.created_at) - t(b.created_at));
  const credits: { left: number; exp: number }[] = [];
  for (const e of sorted) {
    const at = t(e.created_at);
    if (e.points > 0) {
      credits.push({ left: e.points, exp: e.expires_at ? t(e.expires_at) : Infinity });
      continue;
    }
    let owe = -e.points;
    for (const c of credits) {
      if (owe === 0) break;
      if (c.left === 0 || c.exp <= at) continue; // expired before this debit
      const take = Math.min(c.left, owe);
      c.left -= take;
      owe -= take;
    }
  }
  const nowT = now.getTime();
  return credits.reduce((sum, c) => sum + (c.exp > nowT ? c.left : 0), 0);
}

/** Max points usable on an order of `subtotalMinor` with `balance` points available. */
export function maxRedeemable(s: LoyaltySettings, balance: number, subtotalMinor: number): number {
  if (!s.loyalty_enabled || balance <= 0 || subtotalMinor <= 0) return 0;
  const capMinor = Math.floor((subtotalMinor * s.loyalty_max_redeem_pct) / 100);
  return Math.max(0, Math.min(balance, Math.floor(capMinor / s.loyalty_point_value_minor)));
}

export type RedeemCheck =
  | { ok: true; points: number; discount_minor: number }
  | { ok: false; reason: string };

/** Validate a requested redemption against settings, balance and subtotal (server-trusted). */
export function resolveRedemption(
  s: LoyaltySettings,
  input: { points?: number | null; balance: number; subtotalMinor: number },
): RedeemCheck {
  const req = input.points ?? 0;
  if (!req) return { ok: true, points: 0, discount_minor: 0 };
  if (!Number.isInteger(req) || req < 0) return { ok: false, reason: "Invalid points amount" };
  if (!s.loyalty_enabled) return { ok: false, reason: "Loyalty points are not available right now" };
  const max = maxRedeemable(s, input.balance, input.subtotalMinor);
  if (req > max) return { ok: false, reason: `You can use up to ${max} points on this order` };
  return { ok: true, points: req, discount_minor: req * s.loyalty_point_value_minor };
}

/**
 * Earned points to claw back after a refund: proportional to the refunded share
 * of the order total, minus what earlier refunds already reversed.
 */
export function pointsToReverse(earned: number, alreadyReversed: number, refundedTotalMinor: number, orderTotalMinor: number): number {
  if (earned <= 0 || orderTotalMinor <= 0) return 0;
  const share = Math.min(1, Math.max(0, refundedTotalMinor / orderTotalMinor));
  const target = share >= 1 ? earned : Math.floor(earned * share);
  return Math.max(0, Math.min(earned, target) - alreadyReversed);
}
