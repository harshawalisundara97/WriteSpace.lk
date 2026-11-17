import { describe, it, expect } from "vitest";
import {
  canQuoteTransition, quoteTotals, canSendQuote, canAcceptQuote, isQuoteExpired, validUntil, quoteNumber,
} from "@/lib/quotes/rules";

describe("quote state machine", () => {
  it("follows requested → priced → accepted → converted", () => {
    expect(canQuoteTransition("requested", "priced")).toBe(true);
    expect(canQuoteTransition("priced", "accepted")).toBe(true);
    expect(canQuoteTransition("accepted", "converted")).toBe(true);
  });
  it("blocks skips and terminal exits", () => {
    expect(canQuoteTransition("requested", "accepted")).toBe(false);
    expect(canQuoteTransition("converted", "declined")).toBe(false);
    expect(canQuoteTransition("declined", "priced")).toBe(false);
    expect(canQuoteTransition("expired", "priced")).toBe(true);
  });
});

describe("totals", () => {
  it("uses quoted prices with list fallback", () => {
    const t = quoteTotals([
      { qty: 100, list_unit_minor: 150_00, quoted_unit_minor: 120_00 },
      { qty: 10, list_unit_minor: 50_00, quoted_unit_minor: null },
    ], 500_00);
    expect(t).toEqual({ subtotal_minor: 12_500_00, list_subtotal_minor: 15_500_00, savings_minor: 3_000_00, total_minor: 13_000_00 });
  });
});

describe("sending and accepting", () => {
  it("requires every line priced", () => {
    expect(canSendQuote([]).ok).toBe(false);
    expect(canSendQuote([{ qty: 1, list_unit_minor: 1, quoted_unit_minor: null }]).ok).toBe(false);
    expect(canSendQuote([{ qty: 1, list_unit_minor: 1, quoted_unit_minor: 0 }]).ok).toBe(true);
  });
  it("accepts only priced, unexpired quotes", () => {
    const now = new Date("2026-11-17T00:00:00Z");
    expect(canAcceptQuote({ status: "priced", valid_until: "2026-11-20" }, now).ok).toBe(true);
    expect(canAcceptQuote({ status: "priced", valid_until: "2026-11-10" }, now).ok).toBe(false);
    expect(canAcceptQuote({ status: "requested", valid_until: null }, now).ok).toBe(false);
    expect(isQuoteExpired({ status: "priced", valid_until: "2026-11-10" }, now)).toBe(true);
  });
  it("formats numbers and validity", () => {
    const at = new Date("2026-11-17T08:00:00Z");
    expect(quoteNumber(at, "4f2abc")).toBe("Q-20261117-4F2A");
    expect(validUntil(at).toISOString()).toBe("2026-12-01T08:00:00.000Z");
  });
});
