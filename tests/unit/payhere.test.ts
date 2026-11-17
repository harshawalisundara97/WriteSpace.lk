import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  formatPayhereAmount, payhereCheckoutHash, splitName, buildPayhereFields, PAYHERE_CHECKOUT_URL,
} from "@/lib/payments/payhere-checkout";

const md5 = (s: string) => createHash("md5").update(s).digest("hex").toUpperCase();

describe("formatPayhereAmount", () => {
  it("formats minor units with two decimals", () => {
    expect(formatPayhereAmount(0)).toBe("0.00");
    expect(formatPayhereAmount(5)).toBe("0.05");
    expect(formatPayhereAmount(123450)).toBe("1234.50");
    expect(formatPayhereAmount(100000000)).toBe("1000000.00");
  });
  it("rejects non-integer or negative amounts", () => {
    expect(() => formatPayhereAmount(1.5)).toThrow();
    expect(() => formatPayhereAmount(-1)).toThrow();
  });
});

describe("payhereCheckoutHash", () => {
  it("follows UPPER(md5(id+order+amount+cur+UPPER(md5(secret))))", () => {
    const h = payhereCheckoutHash({
      merchantId: "1211149", orderId: "ord-1", amountMinor: 100000, currency: "LKR", merchantSecret: "s3cret",
    });
    expect(h).toBe(md5("1211149" + "ord-1" + "1000.00" + "LKR" + md5("s3cret")));
    expect(h).toMatch(/^[0-9A-F]{32}$/);
  });
  it("changes when the amount changes", () => {
    const base = { merchantId: "1", orderId: "o", currency: "LKR", merchantSecret: "x" };
    expect(payhereCheckoutHash({ ...base, amountMinor: 100 }))
      .not.toBe(payhereCheckoutHash({ ...base, amountMinor: 101 }));
  });
});

describe("splitName", () => {
  it("splits first / rest and falls back for single names", () => {
    expect(splitName("  Nimal  Perera Silva ")).toEqual({ first: "Nimal", last: "Perera Silva" });
    expect(splitName("Kamal")).toEqual({ first: "Kamal", last: "Kamal" });
  });
});

describe("buildPayhereFields", () => {
  const f = buildPayhereFields({
    merchantId: "1211149", merchantSecret: "s3cret", siteUrl: "https://writespace.lk/",
    orderId: "uuid-1", orderNumber: "WS-20261116-1234", amountMinor: 250075, currency: "LKR",
    customer: { fullName: "Nimal Perera", email: "n@example.com", phone: "0771234567", address: "", city: "", country: "Sri Lanka" },
  });
  it("builds URLs, amount and hash", () => {
    expect(f.return_url).toBe("https://writespace.lk/checkout/confirmation/uuid-1");
    expect(f.notify_url).toBe("https://writespace.lk/api/webhooks/payhere");
    expect(f.amount).toBe("2500.75");
    expect(f.hash).toBe(payhereCheckoutHash({
      merchantId: "1211149", orderId: "uuid-1", amountMinor: 250075, currency: "LKR", merchantSecret: "s3cret",
    }));
    expect(f).not.toHaveProperty("merchant_secret");
    expect(Object.values(f)).not.toContain("s3cret");
  });
  it("fills required address fields for store pickup", () => {
    expect(f.address).toBe("N/A");
    expect(f.city).toBe("N/A");
  });
  it("exposes sandbox and live endpoints", () => {
    expect(PAYHERE_CHECKOUT_URL.sandbox).toContain("sandbox.payhere.lk");
  });
});
