import { describe, it, expect } from "vitest";
import { searchProducts, draftPricing, parsePriceMinor, draftVariant } from "@/lib/admin/bundle-builder";
import type { ProductWithVariants } from "@/lib/types";

function product(id: string, name: string, variants: { id: string; sku: string; price: number; name?: string }[], brand: string | null = null): ProductWithVariants {
  return {
    id, name, brand, slug: name.toLowerCase().replace(/\s+/g, "-"), category_id: null, description: null,
    age_group: "all", status: "published", images: [], seo_title: null, seo_description: null,
    specs: {} as ProductWithVariants["specs"], price_tiers: [], created_at: "",
    product_variants: variants.map((v, i) => ({
      id: v.id, product_id: id, sku: v.sku, name: v.name ?? null, options: {}, price_minor: v.price,
      compare_at_minor: null, currency: "LKR", position: i, is_active: true, inventory: null,
    })),
  };
}

const pencil = product("p1", "Pencil HB", [{ id: "v1", sku: "PEN-HB", price: 5000 }, { id: "v1b", sku: "PEN-HB-12", price: 50000, name: "Box of 12" }], "Atlas");
const eraser = product("p2", "Eraser", [{ id: "v2", sku: "ERA-01", price: 3000 }]);
const book = product("p3", "Exercise Book Pencil Grid", [{ id: "v3", sku: "BK-80", price: 12000 }], "Promate");
const all = [pencil, eraser, book];
const byId = (id: string) => all.find((p) => p.id === id);

describe("searchProducts", () => {
  it("returns everything (alphabetical) for an empty query", () => {
    expect(searchProducts(all, "").map((p) => p.id)).toEqual(["p2", "p3", "p1"]);
  });
  it("matches name, brand and SKU, case-insensitively", () => {
    expect(searchProducts(all, "promate").map((p) => p.id)).toEqual(["p3"]);
    expect(searchProducts(all, "era-01").map((p) => p.id)).toEqual(["p2"]);
    expect(searchProducts(all, "box of").map((p) => p.id)).toEqual(["p1"]);
  });
  it("requires every term and ranks name-prefix matches first", () => {
    expect(searchProducts(all, "pencil").map((p) => p.id)).toEqual(["p1", "p3"]);
    expect(searchProducts(all, "pencil grid").map((p) => p.id)).toEqual(["p3"]);
  });
  it("excludes already-used products and respects the limit", () => {
    expect(searchProducts(all, "", new Set(["p1", "p2"])).map((p) => p.id)).toEqual(["p3"]);
    expect(searchProducts(all, "", new Set(), 1)).toHaveLength(1);
  });
});

describe("parsePriceMinor", () => {
  it("parses blank, valid and invalid input", () => {
    expect(parsePriceMinor("  ")).toBeNull();
    expect(parsePriceMinor("1250.5")).toBe(125050);
    expect(parsePriceMinor("-1")).toBeNaN();
    expect(parsePriceMinor("abc")).toBeNaN();
  });
});

describe("draftVariant", () => {
  it("falls back to the first variant", () => {
    expect(draftVariant(pencil, "")?.id).toBe("v1");
    expect(draftVariant(pencil, "v1b")?.id).toBe("v1b");
    expect(draftVariant(pencil, "missing")?.id).toBe("v1");
    expect(draftVariant(undefined, "v1")).toBeNull();
  });
});

describe("draftPricing", () => {
  const items = [
    { product_id: "p1", variant_id: "", quantity: "2" },
    { product_id: "p2", variant_id: "v2", quantity: "1" },
  ];
  it("sums items when no curated price", () => {
    const r = draftPricing(items, "", byId);
    expect(r.lines.map((l) => l.lineMinor)).toEqual([10000, 3000]);
    expect(r).toMatchObject({ itemsTotalMinor: 13000, priceMinor: 13000, savingsMinor: 0, savingsPct: 0, curated: false });
  });
  it("computes savings and percent for a curated price", () => {
    const r = draftPricing(items, "104", byId);
    expect(r).toMatchObject({ priceMinor: 10400, savingsMinor: 2600, savingsPct: 20, curated: true, priceAboveItems: false });
  });
  it("flags a curated price above the items total", () => {
    const r = draftPricing(items, "200", byId);
    expect(r).toMatchObject({ savingsMinor: 0, priceAboveItems: true });
  });
  it("flags invalid prices and treats empty rows / bad qty as zero", () => {
    const r = draftPricing([...items, { product_id: "", variant_id: "", quantity: "x" }], "-5", byId);
    expect(r.invalidPrice).toBe(true);
    expect(r.priceMinor).toBe(13000);
    expect(r.lines[2]).toEqual({ unitMinor: 0, quantity: 0, lineMinor: 0 });
  });
});
