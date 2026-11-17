import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  buildTimeline, contactMatches, courierName, normalizeOrderNumber, normalizePhone, safeTrackingUrl,
} from "@/lib/orders/tracking";
import { trackingSchema } from "@/lib/validation/admin";
import { trackOrder } from "@/lib/orders/track-actions";

describe("tracking helpers", () => {
  it("normalizes order numbers and phones", () => {
    expect(normalizeOrderNumber(" ws-2026 1106-1042 ")).toBe("WS-20261106-1042");
    expect(normalizePhone("+94 77 123 4567")).toBe("771234567");
    expect(normalizePhone("0771234567")).toBe("771234567");
    expect(normalizePhone("0094771234567")).toBe("771234567");
  });

  it("matches contact by email (case-insensitive) or phone", () => {
    const o = { email: "Nimali@Example.com", phone: "+94 77 123 4567" };
    expect(contactMatches("nimali@example.com", o)).toBe(true);
    expect(contactMatches("077 123 4567", o)).toBe(true);
    expect(contactMatches("other@example.com", o)).toBe(false);
    expect(contactMatches("4567", o)).toBe(false);
    expect(contactMatches("0771234567", { email: "x@y.z", phone: null })).toBe(false);
    expect(contactMatches("   ", o)).toBe(false);
  });

  it("only allows http(s) tracking links", () => {
    expect(safeTrackingUrl("https://domex.lk/t?n=1")).toBe("https://domex.lk/t?n=1");
    expect(safeTrackingUrl("javascript:alert(1)")).toBeNull();
    expect(safeTrackingUrl("not a url")).toBeNull();
    expect(safeTrackingUrl(null)).toBeNull();
  });

  it("names couriers", () => {
    expect(courierName("koombiyo")).toBe("Koombiyo");
    expect(courierName("nope")).toBeNull();
  });
});

describe("buildTimeline", () => {
  const createdAt = "2026-11-01T00:00:00Z";

  it("marks steps up to the current status with event times", () => {
    const t = buildTimeline({
      status: "shipped", paymentMethod: "online", createdAt,
      events: [{ status: "paid", at: "p" }, { status: "fulfilled", at: "f" }, { status: "shipped", at: "s" }],
    });
    expect(t.steps.map((s) => [s.id, s.done, s.at])).toEqual([
      ["placed", true, createdAt], ["confirmed", true, "p"], ["packed", true, "f"], ["shipped", true, "s"], ["delivered", false, null],
    ]);
    expect(t.terminal).toBeNull();
  });

  it("falls back to the current status when events are missing", () => {
    const t = buildTimeline({ status: "fulfilled", paymentMethod: "online", createdAt, events: [] });
    expect(t.steps.filter((s) => s.done).map((s) => s.id)).toEqual(["placed", "confirmed", "packed"]);
  });

  it("skips the payment step for cash on delivery", () => {
    const t = buildTimeline({ status: "pending_payment", paymentMethod: "cod", createdAt, events: [] });
    expect(t.steps.map((s) => s.id)).toEqual(["placed", "packed", "shipped", "delivered"]);
    expect(t.steps.filter((s) => s.done).map((s) => s.id)).toEqual(["placed"]);
  });

  it("reports cancellation as terminal, keeping progress made", () => {
    const t = buildTimeline({
      status: "cancelled", paymentMethod: "cod", createdAt,
      events: [{ status: "fulfilled", at: "f" }, { status: "cancelled", at: "c" }],
    });
    expect(t.terminal).toEqual({ status: "cancelled", at: "c" });
    expect(t.steps.filter((s) => s.done).map((s) => s.id)).toEqual(["placed", "packed"]);
  });
});

describe("trackingSchema", () => {
  it("accepts blanks and valid values, rejects bad links / couriers", () => {
    expect(trackingSchema.safeParse({ tracking_number: "", courier: "", tracking_url: "" }).success).toBe(true);
    expect(trackingSchema.safeParse({ tracking_number: "LK1", courier: "domex", tracking_url: "https://x.lk/1" }).success).toBe(true);
    expect(trackingSchema.safeParse({ tracking_url: "javascript:alert(1)" }).success).toBe(false);
    expect(trackingSchema.safeParse({ courier: "dhl" }).success).toBe(false);
  });
});

describe("trackOrder (demo mode)", () => {
  it("finds a demo order by number + email or phone", async () => {
    const r = await trackOrder({ orderNumber: "ws-20261104-2210", contact: "0719876543" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.order.status).toBe("shipped");
      expect(r.order.courier).toBe("Domex");
      expect(r.order.trackingNumber).toBe("LK4820193");
      expect(r.order.timeline.steps.find((s) => s.id === "shipped")?.done).toBe(true);
    }
  });

  it("returns the same generic error for unknown order or wrong contact", async () => {
    const a = await trackOrder({ orderNumber: "WS-00000000-0000", contact: "dilshan@example.com" });
    const b = await trackOrder({ orderNumber: "WS-20261104-2210", contact: "someone@else.com" });
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(false);
    if (!a.ok && !b.ok) expect(a.error).toBe(b.error);
  });

  it("validates input", async () => {
    const r = await trackOrder({ orderNumber: "", contact: "" });
    expect(r.ok).toBe(false);
  });
});
