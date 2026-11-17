import { describe, it, expect } from "vitest";
import {
  DEFAULT_LOYALTY_SETTINGS as D, toLoyaltySettings, pointsEarned, expiryFor, balanceAt, maxRedeemable, resolveRedemption,
} from "@/lib/loyalty/rules";

const S = { ...D, loyalty_enabled: true };

describe("loyalty settings", () => {
  it("falls back to defaults on bad input", () => {
    expect(toLoyaltySettings(null)).toEqual(D);
    expect(toLoyaltySettings({ loyalty_max_redeem_pct: 150, loyalty_earn_per_minor: 0 })).toEqual(D);
    expect(toLoyaltySettings({ loyalty_enabled: true, loyalty_expiry_months: 0 }).loyalty_expiry_months).toBe(0);
  });
});

describe("earning", () => {
  it("earns 1 pt per LKR 100, floored", () => {
    expect(pointsEarned(S, 12_345_00)).toBe(123);
    expect(pointsEarned(S, 99_99)).toBe(0);
  });
  it("earns nothing when disabled", () => {
    expect(pointsEarned(D, 100_000)).toBe(0);
  });
  it("expires 12 months later, month-end safe", () => {
    expect(expiryFor(S, new Date("2026-01-31T10:00:00Z"))!.toISOString()).toBe("2027-01-31T10:00:00.000Z");
    expect(expiryFor({ ...S, loyalty_expiry_months: 1 }, new Date("2027-01-31T00:00:00Z"))!.toISOString())
      .toBe("2027-02-28T00:00:00.000Z");
    expect(expiryFor({ ...S, loyalty_expiry_months: 0 }, new Date())).toBeNull();
  });
});

describe("balance", () => {
  const e = (points: number, created_at: string, expires_at?: string) => ({ points, created_at, expires_at });
  it("sums credits minus debits", () => {
    expect(balanceAt([e(100, "2026-01-01"), e(-30, "2026-02-01")], new Date("2026-03-01"))).toBe(70);
  });
  it("drops the unused part of expired credits (FIFO)", () => {
    const l = [e(100, "2026-01-01", "2026-06-01"), e(50, "2026-03-01", "2026-12-01"), e(-80, "2026-04-01")];
    expect(balanceAt(l, new Date("2026-05-01"))).toBe(70);
    expect(balanceAt(l, new Date("2026-07-01"))).toBe(50);
  });
  it("skips credits already expired when a debit lands", () => {
    const l = [e(100, "2026-01-01", "2026-02-01"), e(40, "2026-03-01"), e(-30, "2026-04-01")];
    expect(balanceAt(l, new Date("2026-05-01"))).toBe(10);
  });
  it("never goes negative", () => {
    expect(balanceAt([e(-10, "2026-01-01")])).toBe(0);
  });
});

describe("redemption", () => {
  it("caps at 50% of subtotal and at balance", () => {
    expect(maxRedeemable(S, 10_000, 1000_00)).toBe(500);
    expect(maxRedeemable(S, 120, 1000_00)).toBe(120);
    expect(maxRedeemable(D, 120, 1000_00)).toBe(0);
  });
  it("validates requested points", () => {
    expect(resolveRedemption(S, { points: 0, balance: 0, subtotalMinor: 0 })).toEqual({ ok: true, points: 0, discount_minor: 0 });
    expect(resolveRedemption(S, { points: 100, balance: 200, subtotalMinor: 1000_00 }))
      .toEqual({ ok: true, points: 100, discount_minor: 100_00 });
    expect(resolveRedemption(S, { points: 600, balance: 1000, subtotalMinor: 1000_00 }).ok).toBe(false);
    expect(resolveRedemption(S, { points: 1.5, balance: 10, subtotalMinor: 1000_00 }).ok).toBe(false);
    expect(resolveRedemption(D, { points: 1, balance: 10, subtotalMinor: 1000_00 }).ok).toBe(false);
  });
});
