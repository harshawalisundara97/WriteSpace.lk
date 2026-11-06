import { describe, it, expect } from "vitest";
import { canTransition, assertTransition, nextStatuses } from "@/lib/orders/state-machine";

describe("order state machine", () => {
  it("allows the happy path", () => {
    expect(canTransition("pending_payment", "paid")).toBe(true);
    expect(canTransition("paid", "fulfilled")).toBe(true);
    expect(canTransition("fulfilled", "shipped")).toBe(true);
    expect(canTransition("shipped", "delivered")).toBe(true);
  });

  it("rejects skipping or reversing", () => {
    expect(canTransition("pending_payment", "shipped")).toBe(false);
    expect(canTransition("delivered", "paid")).toBe(false);
    expect(canTransition("shipped", "fulfilled")).toBe(false);
  });

  it("treats cancelled and refunded as terminal", () => {
    expect(nextStatuses("cancelled")).toEqual([]);
    expect(nextStatuses("refunded")).toEqual([]);
  });

  it("allows refunds from paid onward", () => {
    expect(canTransition("paid", "refunded")).toBe(true);
    expect(canTransition("delivered", "partially_refunded")).toBe(true);
    expect(canTransition("pending_payment", "refunded")).toBe(false);
  });

  it("assertTransition throws on invalid", () => {
    expect(() => assertTransition("pending_payment", "delivered")).toThrow();
    expect(() => assertTransition("paid", "fulfilled")).not.toThrow();
  });
});
