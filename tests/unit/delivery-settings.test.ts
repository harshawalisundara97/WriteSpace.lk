import { describe, it, expect } from "vitest";
import {
  availableDeliveryMethods, deliveryFee, isDeliveryMethodEnabled, toDeliverySettings,
  DEFAULT_DELIVERY_SETTINGS, EXPRESS_SURCHARGE_MINOR,
} from "@/lib/checkout/delivery";
import { computeTotals } from "@/lib/pricing/cart-total";
import { settingsSchema } from "@/lib/validation/admin";
import type { CartLine } from "@/lib/types";

const line = { product_id: "p", variant_id: "v", quantity: 1, unit_price_minor: 100000, available: 10 } as unknown as CartLine;
const base = { flat_shipping_minor: 35000, free_shipping_threshold_minor: null, tax_rate_bps: 0 };

describe("toDeliverySettings", () => {
  it("falls back to defaults for missing / invalid columns", () => {
    expect(toDeliverySettings(null)).toEqual(DEFAULT_DELIVERY_SETTINGS);
    expect(toDeliverySettings({ express_surcharge_minor: -5, express_enabled: "yes" })).toEqual(DEFAULT_DELIVERY_SETTINGS);
  });
  it("keeps valid values and trims notes", () => {
    const s = toDeliverySettings({ express_surcharge_minor: 60000, pickup_enabled: false, express_description: "  Next day  ", standard_description: " " });
    expect(s.express_surcharge_minor).toBe(60000);
    expect(s.pickup_enabled).toBe(false);
    expect(s.express_description).toBe("Next day");
    expect(s.standard_description).toBeNull();
  });
});

describe("availableDeliveryMethods", () => {
  it("hides disabled methods but always offers standard", () => {
    const s = { ...DEFAULT_DELIVERY_SETTINGS, express_enabled: false, pickup_enabled: false };
    expect(availableDeliveryMethods(s).map((m) => m.id)).toEqual(["standard"]);
    expect(isDeliveryMethodEnabled("standard", s)).toBe(true);
    expect(isDeliveryMethodEnabled("express", s)).toBe(false);
  });
  it("applies admin copy over defaults", () => {
    const m = availableDeliveryMethods({ ...DEFAULT_DELIVERY_SETTINGS, pickup_description: "Colombo 03 store" });
    expect(m.find((x) => x.id === "pickup")?.description).toBe("Colombo 03 store");
    expect(m.find((x) => x.id === "standard")?.description).toMatch(/working days/);
  });
});

describe("configurable express surcharge", () => {
  it("defaults to the legacy constant", () => {
    expect(deliveryFee("express", { flat_shipping_minor: 35000, standardFree: false })).toBe(35000 + EXPRESS_SURCHARGE_MINOR);
  });
  it("uses the store surcharge in computeTotals", () => {
    const t = computeTotals([line], [], { ...base, express_surcharge_minor: 10000, delivery_method: "express" });
    expect(t.shipping_minor).toBe(45000);
  });
});

describe("settingsSchema delivery fields", () => {
  const s = { store_name: "WriteSpace", currency: "lkr", flat_shipping_minor: 0, free_shipping_threshold_minor: null, tax_rate_bps: 0, support_email: "" };
  it("defaults when omitted", () => {
    const r = settingsSchema.safeParse(s);
    expect(r.success && r.data.express_surcharge_minor).toBe(40000);
    expect(r.success && r.data.express_enabled).toBe(true);
  });
  it("rejects a negative surcharge", () => {
    expect(settingsSchema.safeParse({ ...s, express_surcharge_minor: -1 }).success).toBe(false);
  });
});
