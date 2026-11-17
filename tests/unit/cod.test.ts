import { describe, it, expect } from "vitest";
import { DEFAULT_COD_SETTINGS, SL_DISTRICTS, codEligibility, paymentFee, toCodSettings, type CodSettings } from "@/lib/checkout/cod";
import { checkoutSchema } from "@/lib/validation/checkout";
import { settingsSchema } from "@/lib/validation/admin";

const on: CodSettings = { ...DEFAULT_COD_SETTINGS, cod_enabled: true, cod_districts: ["Colombo", "Gampaha"] };

describe("codEligibility", () => {
  it("is off unless enabled", () => {
    const r = codEligibility(DEFAULT_COD_SETTINGS, { orderTotalMinor: 1000, deliveryMethod: "standard", district: "Colombo" });
    expect(r.ok).toBe(false);
  });
  it("allows an enabled district under the limit", () => {
    expect(codEligibility(on, { orderTotalMinor: 2500000, deliveryMethod: "standard", district: "Colombo" }).ok).toBe(true);
  });
  it("rejects orders over the max (checked before the fee)", () => {
    expect(codEligibility(on, { orderTotalMinor: 2500001, deliveryMethod: "standard", district: "Colombo" }).ok).toBe(false);
  });
  it("has no limit when max is null", () => {
    expect(codEligibility({ ...on, cod_max_order_minor: null }, { orderTotalMinor: 9e9, deliveryMethod: "express", district: "Gampaha" }).ok).toBe(true);
  });
  it("rejects disallowed, missing or unknown districts", () => {
    expect(codEligibility(on, { orderTotalMinor: 1, deliveryMethod: "standard", district: "Jaffna" })).toEqual({ ok: false, reason: "Cash on delivery is not available in Jaffna" });
    expect(codEligibility(on, { orderTotalMinor: 1, deliveryMethod: "standard", district: "" }).ok).toBe(false);
    expect(codEligibility(on, { orderTotalMinor: 1, deliveryMethod: "standard", district: "Atlantis" }).ok).toBe(false);
  });
  it("ignores district for store pickup but keeps the max", () => {
    expect(codEligibility(on, { orderTotalMinor: 1, deliveryMethod: "pickup" }).ok).toBe(true);
    expect(codEligibility(on, { orderTotalMinor: 3000000, deliveryMethod: "pickup" }).ok).toBe(false);
  });
});

describe("paymentFee / toCodSettings", () => {
  it("charges the fee only for COD", () => {
    expect(paymentFee("cod", on)).toBe(15000);
    expect(paymentFee("online", on)).toBe(0);
  });
  it("defaults missing columns and drops unknown districts", () => {
    expect(toCodSettings(null)).toEqual(DEFAULT_COD_SETTINGS);
    expect(toCodSettings({ cod_enabled: true, cod_fee_minor: -5, cod_max_order_minor: null, cod_districts: ["Kandy", "Nowhere"] }))
      .toEqual({ cod_enabled: true, cod_fee_minor: 15000, cod_max_order_minor: null, cod_districts: ["Kandy"] });
  });
  it("ships all 25 districts by default", () => {
    expect(SL_DISTRICTS).toHaveLength(25);
    expect(DEFAULT_COD_SETTINGS.cod_districts).toHaveLength(25);
  });
});

describe("schemas", () => {
  it("checkout defaults to online payment", () => {
    const r = checkoutSchema.parse({ full_name: "Nimali", email: "n@example.com", phone: "0771234567", line1: "12 Galle Rd", city: "Colombo" });
    expect(r.payment_method).toBe("online");
  });
  it("settings rejects unknown districts and negative fees", () => {
    const base = { store_name: "WS", currency: "LKR", flat_shipping_minor: 0, free_shipping_threshold_minor: null, tax_rate_bps: 0, support_email: "" };
    expect(settingsSchema.safeParse({ ...base, cod_districts: ["Atlantis"] }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, cod_fee_minor: -1 }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, cod_enabled: true, cod_districts: ["Colombo"] }).success).toBe(true);
  });
});
