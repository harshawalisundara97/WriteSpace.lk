import { describe, expect, it } from "vitest";
import { idleWindow, isAbandoned, unsubscribeToken, verifyUnsubscribeToken, type CartCandidate } from "@/lib/cart/abandoned";

const now = new Date("2026-11-16T10:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();
const base: CartCandidate = { updated_at: hoursAgo(30), reminder_sent_at: null, item_count: 2, opted_out: false, blocked: false, email: "a@b.lk" };

describe("isAbandoned", () => {
  it("idle 30h with items → yes", () => expect(isAbandoned(base, now)).toBe(true));
  it("exactly 24h → yes; 23h → no", () => {
    expect(isAbandoned({ ...base, updated_at: hoursAgo(24) }, now)).toBe(true);
    expect(isAbandoned({ ...base, updated_at: hoursAgo(23) }, now)).toBe(false);
  });
  it("older than 7 days → no", () => expect(isAbandoned({ ...base, updated_at: hoursAgo(24 * 8) }, now)).toBe(false));
  it("already reminded / opted out / blocked / empty / no email → no", () => {
    expect(isAbandoned({ ...base, reminder_sent_at: hoursAgo(1) }, now)).toBe(false);
    expect(isAbandoned({ ...base, opted_out: true }, now)).toBe(false);
    expect(isAbandoned({ ...base, blocked: true }, now)).toBe(false);
    expect(isAbandoned({ ...base, item_count: 0 }, now)).toBe(false);
    expect(isAbandoned({ ...base, email: null }, now)).toBe(false);
  });
  it("bad date → no", () => expect(isAbandoned({ ...base, updated_at: "nope" }, now)).toBe(false));
});

describe("idleWindow", () => {
  it("spans 7 days ago to 24h ago", () => {
    expect(idleWindow(now)).toEqual({ from: "2026-11-09T10:00:00.000Z", to: "2026-11-15T10:00:00.000Z" });
  });
});

describe("unsubscribe token", () => {
  const id = "3f1c2a8e-1111-4222-8333-444455556666";
  it("round-trips", () => expect(verifyUnsubscribeToken(id, unsubscribeToken(id, "s3cret"), "s3cret")).toBe(true));
  it("rejects wrong secret, customer, tampering, empty secret", () => {
    const t = unsubscribeToken(id, "s3cret");
    expect(verifyUnsubscribeToken(id, t, "other")).toBe(false);
    expect(verifyUnsubscribeToken("someone-else", t, "s3cret")).toBe(false);
    expect(verifyUnsubscribeToken(id, t.slice(0, -1) + (t.endsWith("A") ? "B" : "A"), "s3cret")).toBe(false);
    expect(verifyUnsubscribeToken(id, unsubscribeToken(id, ""), "")).toBe(false);
  });
});
