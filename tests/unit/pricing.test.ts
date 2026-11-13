import { describe, it, expect } from "vitest";
import { applyPromotions } from "@/lib/pricing/promotions-engine";
import { computeTotals } from "@/lib/pricing/cart-total";
import type { CartLine, Promotion } from "@/lib/types";
import { checkoutSchema } from "@/lib/validation/checkout";

function line(price: number, qty: number): CartLine {
  return {
    variant_id: crypto.randomUUID(),
    product_id: "p",
    product_name: "x",
    product_slug: "x",
    variant_name: null,
    sku: "sku",
    image: null,
    unit_price_minor: price,
    compare_at_minor: null,
    quantity: qty,
    available: 100,
  };
}

function promo(p: Partial<Promotion>): Promotion {
  return {
    id: p.id ?? crypto.randomUUID(),
    name: p.name ?? "promo",
    type: p.type ?? "percentage",
    value: p.value ?? 0,
    code: p.code ?? null,
    meta: p.meta ?? {},
    min_subtotal_minor: p.min_subtotal_minor ?? 0,
    usage_limit: p.usage_limit ?? null,
    per_customer_limit: p.per_customer_limit ?? null,
    stackable: p.stackable ?? false,
    priority: p.priority ?? 0,
    is_active: p.is_active ?? true,
    starts_at: p.starts_at ?? null,
    ends_at: p.ends_at ?? null,
  };
}

const settings = { flat_shipping_minor: 35000, free_shipping_threshold_minor: 500000, tax_rate_bps: 0 };

describe("promotions engine", () => {
  it("applies a percentage discount", () => {
    const r = applyPromotions([line(100000, 2)], [promo({ type: "percentage", value: 10 })]);
    expect(r.subtotal_minor).toBe(200000);
    expect(r.discount_minor).toBe(20000);
  });

  it("caps fixed discount at subtotal", () => {
    const r = applyPromotions([line(5000, 1)], [promo({ type: "fixed", value: 10000 })]);
    expect(r.discount_minor).toBe(5000);
  });

  it("requires the matching coupon code", () => {
    const p = [promo({ type: "percentage", value: 20, code: "SAVE20" })];
    expect(applyPromotions([line(100000, 1)], p).discount_minor).toBe(0);
    expect(applyPromotions([line(100000, 1)], p, "save20").discount_minor).toBe(20000);
  });

  it("ignores expired promotions", () => {
    const r = applyPromotions(
      [line(100000, 1)],
      [promo({ type: "percentage", value: 50, ends_at: "2000-01-01T00:00:00Z" })],
    );
    expect(r.discount_minor).toBe(0);
  });

  it("respects min subtotal", () => {
    const r = applyPromotions([line(10000, 1)], [promo({ type: "percentage", value: 10, min_subtotal_minor: 50000 })]);
    expect(r.discount_minor).toBe(0);
  });

  it("picks the single best exclusive promo", () => {
    const r = applyPromotions(
      [line(100000, 1)],
      [promo({ type: "percentage", value: 10 }), promo({ type: "fixed", value: 25000 })],
    );
    expect(r.discount_minor).toBe(25000);
    expect(r.applied).toHaveLength(1);
  });

  it("stacks stackable promos", () => {
    const r = applyPromotions(
      [line(100000, 1)],
      [promo({ type: "percentage", value: 10, stackable: true }), promo({ type: "free_shipping", stackable: true })],
    );
    expect(r.discount_minor).toBe(10000);
    expect(r.free_shipping).toBe(true);
  });

  it("enforces per-customer limit", () => {
    const p = promo({ type: "percentage", value: 10, per_customer_limit: 1 });
    const r = applyPromotions([line(100000, 1)], [p], null, { customerRedemptions: { [p.id]: 1 } });
    expect(r.discount_minor).toBe(0);
  });

  it("bxgy: buy 2 get 1 free makes cheapest free", () => {
    const r = applyPromotions(
      [line(30000, 2), line(10000, 1)],
      [promo({ type: "bxgy", meta: { buy_qty: 2, get_qty: 1 } })],
    );
    expect(r.discount_minor).toBe(10000); // one cheapest unit free
  });
});

describe("cart totals", () => {
  it("adds flat shipping below threshold", () => {
    const t = computeTotals([line(100000, 1)], [], settings);
    expect(t.shipping_minor).toBe(35000);
    expect(t.total_minor).toBe(135000);
  });

  it("free shipping at threshold", () => {
    const t = computeTotals([line(500000, 1)], [], settings);
    expect(t.shipping_minor).toBe(0);
    expect(t.total_minor).toBe(500000);
  });

  it("free_shipping promo zeroes shipping", () => {
    const t = computeTotals([line(100000, 1)], [promo({ type: "free_shipping" })], settings);
    expect(t.shipping_minor).toBe(0);
  });

  it("applies tax on discounted subtotal", () => {
    const t = computeTotals([line(100000, 1)], [promo({ type: "percentage", value: 10 })], {
      ...settings,
      tax_rate_bps: 1000, // 10%
    });
    // subtotal 100000, -10000 = 90000, tax 9000, +shipping 35000 = 134000
    expect(t.discount_minor).toBe(10000);
    expect(t.tax_minor).toBe(9000);
    expect(t.total_minor).toBe(134000);
  });

  it("empty cart has no shipping", () => {
    const t = computeTotals([], [], settings);
    expect(t.total_minor).toBe(0);
  });
});

describe("delivery methods", () => {
  it("defaults to standard", () => {
    const t = computeTotals([line(100000, 1)], [], { ...settings, delivery_method: "standard" });
    expect(t.shipping_minor).toBe(computeTotals([line(100000, 1)], [], settings).shipping_minor);
  });

  it("express = flat + surcharge", () => {
    const t = computeTotals([line(100000, 1)], [], { ...settings, delivery_method: "express" });
    expect(t.shipping_minor).toBe(75000);
    expect(t.total_minor).toBe(175000);
  });

  it("express is not waived by the threshold or a free-shipping promo", () => {
    const over = computeTotals([line(500000, 1)], [], { ...settings, delivery_method: "express" });
    expect(over.shipping_minor).toBe(75000);
    const promoed = computeTotals([line(100000, 1)], [promo({ type: "free_shipping" })], { ...settings, delivery_method: "express" });
    expect(promoed.shipping_minor).toBe(75000);
  });

  it("pickup is always free", () => {
    const t = computeTotals([line(100000, 1)], [], { ...settings, delivery_method: "pickup" });
    expect(t.shipping_minor).toBe(0);
    expect(t.total_minor).toBe(100000);
  });

  it("empty cart has no express fee", () => {
    expect(computeTotals([], [], { ...settings, delivery_method: "express" }).total_minor).toBe(0);
  });

  const contact = { full_name: "Test Buyer", email: "buyer@example.com", phone: "0771234567" };

  it("requires an address for delivery but not for pickup", () => {
    expect(checkoutSchema.safeParse({ ...contact, delivery_method: "standard" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...contact, delivery_method: "pickup" }).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...contact, line1: "42 Galle Road", city: "Colombo", delivery_method: "express" }).success).toBe(true);
  });

  it("rejects unknown methods and defaults a missing one to standard", () => {
    expect(checkoutSchema.safeParse({ ...contact, delivery_method: "drone" }).success).toBe(false);
    const r = checkoutSchema.safeParse({ ...contact, line1: "42 Galle Road", city: "Colombo" });
    expect(r.success && r.data.delivery_method).toBe("standard");
  });
});
