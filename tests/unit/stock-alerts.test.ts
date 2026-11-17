import { describe, expect, it } from "vitest";
import { availableUnits, canRequestAlert, summariseDemand } from "@/lib/stock-alerts/rules";

describe("stock alert rules", () => {
  it("availableUnits never negative", () => {
    expect(availableUnits({ on_hand: 3, reserved: 5 })).toBe(0);
    expect(availableUnits({ on_hand: 5, reserved: 2 })).toBe(3);
    expect(availableUnits(null)).toBe(0);
  });
  it("only out-of-stock variants accept alerts", () => {
    expect(canRequestAlert({ on_hand: 0, reserved: 0 })).toBe(true);
    expect(canRequestAlert({ on_hand: 2, reserved: 2 })).toBe(true);
    expect(canRequestAlert({ on_hand: 1, reserved: 0 })).toBe(false);
  });
  it("summariseDemand groups and sorts by waiting, then oldest", () => {
    const row = (variant_id: string, created_at: string) => ({ variant_id, created_at, product_name: variant_id, product_slug: variant_id, variant_name: null, sku: variant_id, available: 0 });
    const out = summariseDemand([
      row("a", "2026-11-03"), row("b", "2026-11-02"), row("b", "2026-11-05"), row("c", "2026-11-01"),
    ]);
    expect(out.map((d) => [d.variant_id, d.waiting, d.oldest])).toEqual([
      ["b", 2, "2026-11-02"], ["c", 1, "2026-11-01"], ["a", 1, "2026-11-03"],
    ]);
  });
});
