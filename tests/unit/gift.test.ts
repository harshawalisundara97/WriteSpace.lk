import { describe, expect, it } from "vitest";
import { DEFAULT_GIFT_SETTINGS, GIFT_MESSAGE_MAX, normaliseGiftMessage, resolveGift, toGiftSettings } from "@/lib/checkout/gift";
import { checkoutSchema } from "@/lib/validation/checkout";

describe("toGiftSettings", () => {
  it("defaults when missing or bad", () => {
    expect(toGiftSettings(null)).toEqual(DEFAULT_GIFT_SETTINGS);
    expect(toGiftSettings({ gift_wrap_enabled: "yes", gift_wrap_fee_minor: -5 })).toEqual(DEFAULT_GIFT_SETTINGS);
    expect(toGiftSettings({ gift_wrap_fee_minor: 1.5 }).gift_wrap_fee_minor).toBe(25000);
  });
  it("reads valid values", () => {
    expect(toGiftSettings({ gift_wrap_enabled: true, gift_wrap_fee_minor: 0 })).toEqual({ gift_wrap_enabled: true, gift_wrap_fee_minor: 0 });
  });
});

describe("normaliseGiftMessage", () => {
  it("empty → null", () => {
    expect(normaliseGiftMessage("")).toBeNull();
    expect(normaliseGiftMessage("  \n \n ")).toBeNull();
    expect(normaliseGiftMessage(undefined)).toBeNull();
  });
  it("trims, normalises newlines, collapses blank runs", () => {
    expect(normaliseGiftMessage("  Happy birthday!  \r\n\r\n\r\n\r\nLove, Amma  ")).toBe("Happy birthday!\n\nLove, Amma");
  });
  it("caps length", () => {
    expect(normaliseGiftMessage("x".repeat(500))!.length).toBe(GIFT_MESSAGE_MAX);
  });
});

describe("resolveGift", () => {
  const on = { gift_wrap_enabled: true, gift_wrap_fee_minor: 25000 };
  it("no wrap → no fee, message dropped", () => {
    expect(resolveGift(on, { gift_wrap: false, gift_message: "hi" })).toEqual({ ok: true, gift_wrap: false, gift_message: null, fee_minor: 0 });
  });
  it("wrap adds fee and keeps message", () => {
    expect(resolveGift(on, { gift_wrap: true, gift_message: " hi " })).toEqual({ ok: true, gift_wrap: true, gift_message: "hi", fee_minor: 25000 });
  });
  it("refuses wrap when disabled", () => {
    expect(resolveGift({ ...on, gift_wrap_enabled: false }, { gift_wrap: true }).ok).toBe(false);
  });
});

describe("checkoutSchema gift fields", () => {
  const base = { full_name: "Nimal Perera", email: "n@example.com", phone: "0771234567", line1: "12 Main St", city: "Colombo" };
  it("defaults gift_wrap to false", () => {
    const r = checkoutSchema.parse(base);
    expect(r.gift_wrap).toBe(false);
  });
  it("rejects over-long messages", () => {
    expect(checkoutSchema.safeParse({ ...base, gift_wrap: true, gift_message: "x".repeat(201) }).success).toBe(false);
  });
});
