import { describe, it, expect } from "vitest";
import { bundleSchema, normalizeBundleItems } from "@/lib/validation/bundle";

const U1 = "11111111-1111-1111-1111-111111111111";
const U2 = "22222222-2222-2222-2222-222222222222";
const U3 = "33333333-3333-3333-3333-333333333333";

const valid = {
  name: "Grade 1 Starter",
  slug: "grade-1-starter",
  items: [{ product_id: U1, quantity: 2 }],
};

describe("bundleSchema", () => {
  it("accepts a minimal valid bundle and applies defaults", () => {
    const r = bundleSchema.parse(valid);
    expect(r.age_group).toBe("all");
    expect(r.status).toBe("published");
    expect(r.is_featured).toBe(false);
    expect(r.position).toBe(0);
    expect(r.items[0].quantity).toBe(2);
  });

  it("allows a null curated price and an empty description", () => {
    const r = bundleSchema.parse({ ...valid, bundle_price_minor: null, description: "" });
    expect(r.bundle_price_minor).toBeNull();
  });

  it("rejects a bad slug", () => {
    expect(bundleSchema.safeParse({ ...valid, slug: "Not A Slug" }).success).toBe(false);
  });

  it("rejects a bundle with no items", () => {
    expect(bundleSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
  });

  it("rejects a non-positive quantity", () => {
    expect(bundleSchema.safeParse({ ...valid, items: [{ product_id: U1, quantity: 0 }] }).success).toBe(false);
  });

  it("rejects a non-uuid product id", () => {
    expect(bundleSchema.safeParse({ ...valid, items: [{ product_id: "p1", quantity: 1 }] }).success).toBe(false);
  });

  it("rejects a negative curated price", () => {
    expect(bundleSchema.safeParse({ ...valid, bundle_price_minor: -1 }).success).toBe(false);
  });
});

describe("normalizeBundleItems", () => {
  it("assigns sequential positions in order and coerces missing variant to null", () => {
    const out = normalizeBundleItems([
      { product_id: U1, quantity: 2, position: 0 },
      { product_id: U2, variant_id: U3, quantity: 1, position: 0 },
    ]);
    expect(out).toEqual([
      { product_id: U1, variant_id: null, quantity: 2, position: 0 },
      { product_id: U2, variant_id: U3, quantity: 1, position: 1 },
    ]);
  });

  it("drops duplicate products, keeping the first occurrence", () => {
    const out = normalizeBundleItems([
      { product_id: U1, quantity: 2, position: 0 },
      { product_id: U1, quantity: 9, position: 0 },
      { product_id: U2, quantity: 1, position: 0 },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ product_id: U1, variant_id: null, quantity: 2, position: 0 });
    expect(out[1]).toEqual({ product_id: U2, variant_id: null, quantity: 1, position: 1 });
  });
});
