import { describe, expect, it } from "vitest";
import {
  bannerSchema, categorySchema, dbErrorMessage, idSchema, parseInput, promoSchema, settingsSchema, zodErrorMessage,
} from "@/lib/validation/admin";

const uuid = "11111111-1111-4111-8111-111111111111";
const promo = { name: "Back to school", type: "percentage", value: 10 };
const settings = { store_name: "WriteSpace", currency: "lkr", flat_shipping_minor: 0, free_shipping_threshold_minor: null, tax_rate_bps: 0, support_email: "" };

describe("admin validation", () => {
  it("prefixes errors with a readable field label", () => {
    const r = parseInput(categorySchema, { name: "Pens", slug: "Bad Slug", age_group: "all" });
    expect(r).toEqual({ ok: false, error: "Slug: Lowercase letters, numbers and dashes only" });
  });

  it("rejects a category that is its own parent", () => {
    const r = categorySchema.safeParse({ id: uuid, parent_id: uuid, name: "Pens", slug: "pens", age_group: "all" });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodErrorMessage(r.error)).toBe("Parent: A category can't be its own parent");
  });

  it("bounds percentage promotions to 1–100", () => {
    expect(promoSchema.safeParse({ ...promo, value: 150 }).success).toBe(false);
    expect(promoSchema.safeParse({ ...promo, value: 0 }).success).toBe(false);
    expect(promoSchema.safeParse(promo).success).toBe(true);
  });

  it("requires a positive fixed discount and a clean code", () => {
    expect(promoSchema.safeParse({ ...promo, type: "fixed", value: 0 }).success).toBe(false);
    expect(promoSchema.safeParse({ ...promo, code: "SAVE 10" }).success).toBe(false);
    expect(promoSchema.safeParse({ ...promo, code: "" }).success).toBe(true);
  });

  it("rejects end dates before start dates", () => {
    const r = parseInput(promoSchema, { ...promo, starts_at: "2026-12-10T00:00", ends_at: "2026-12-01T00:00" });
    expect(r).toEqual({ ok: false, error: "End date: Must be after the start date" });
    expect(promoSchema.safeParse({ ...promo, starts_at: "", ends_at: "" }).success).toBe(true);
    expect(promoSchema.safeParse({ ...promo, starts_at: "not a date" }).success).toBe(false);
  });

  it("accepts relative or absolute banner links only", () => {
    const b = { title: "Sale", placement: "home_hero" };
    expect(bannerSchema.safeParse({ ...b, link_url: "/bundles" }).success).toBe(true);
    expect(bannerSchema.safeParse({ ...b, link_url: "https://x.lk" }).success).toBe(true);
    expect(bannerSchema.safeParse({ ...b, link_url: "javascript:alert(1)" }).success).toBe(false);
  });

  it("normalizes currency and validates settings", () => {
    const r = settingsSchema.safeParse(settings);
    expect(r.success && r.data.currency).toBe("LKR");
    expect(settingsSchema.safeParse({ ...settings, tax_rate_bps: 20000 }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...settings, instagram_url: "instagram.com/x" }).success).toBe(false);
  });

  it("validates ids and maps db errors", () => {
    expect(idSchema.safeParse("nope").success).toBe(false);
    expect(dbErrorMessage({ code: "23505", message: "dup" })).toBe("That slug or code is already in use");
    expect(dbErrorMessage({ message: "boom" })).toBe("boom");
  });
});
