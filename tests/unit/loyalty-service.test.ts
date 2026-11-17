import { describe, it, expect, vi } from "vitest";
import { createFakeDb, type FakeCall } from "./helpers/fake-db";
vi.mock("server-only", () => ({}));
import { awardOrderPoints, reverseOrderPoints } from "@/lib/loyalty/service";
import { pointsToReverse } from "@/lib/loyalty/rules";

const ON = { loyalty_enabled: true };
const order = { customer_id: "c1", subtotal_minor: 12_000_00, discount_minor: 1_000_00, loyalty_discount_minor: 500_00, total_minor: 11_000_00 };

describe("pointsToReverse", () => {
  it("is proportional and net of earlier reversals", () => {
    expect(pointsToReverse(100, 0, 500, 1000)).toBe(50);
    expect(pointsToReverse(100, 50, 1000, 1000)).toBe(50);
    expect(pointsToReverse(100, 0, 1000, 1000)).toBe(100);
    expect(pointsToReverse(0, 0, 1000, 1000)).toBe(0);
  });
});

describe("awardOrderPoints", () => {
  const run = (r: (c: FakeCall) => { data?: unknown; error?: { message: string } | null }) => {
    const { db, calls } = createFakeDb(r);
    return { db, calls };
  };
  it("credits floor((subtotal − discounts) / LKR 100) with 12-month expiry and audits", async () => {
    const { db, calls } = run((c) =>
      c.table === "store_settings" ? { data: ON } : c.table === "orders" ? { data: order } : { data: null });
    const res = await awardOrderPoints(db, "o1", "admin-1", new Date("2026-11-17T00:00:00Z"));
    expect(res).toEqual({ points: 105 });
    const ins = calls.find((c) => c.table === "loyalty_ledger" && c.op === "insert")!;
    expect(ins.payload).toMatchObject({ customer_id: "c1", kind: "earn", points: 105, expires_at: "2027-11-17T00:00:00.000Z" });
    expect(calls.some((c) => c.table === "audit_logs" && (c.payload as { action: string }).action === "loyalty.earn")).toBe(true);
  });
  it("is idempotent, skips guests and disabled stores", async () => {
    const already = run((c) => c.table === "store_settings" ? { data: ON } : c.table === "orders" ? { data: order } : { data: { id: "x" } });
    expect(await awardOrderPoints(already.db, "o1", null)).toBeNull();
    const guest = run((c) => c.table === "store_settings" ? { data: ON } : c.table === "orders" ? { data: { ...order, customer_id: null } } : { data: null });
    expect(await awardOrderPoints(guest.db, "o1", null)).toBeNull();
    const off = run((c) => c.table === "orders" ? { data: order } : { data: null });
    expect(await awardOrderPoints(off.db, "o1", null)).toBeNull();
    for (const x of [already, guest, off]) expect(x.calls.some((c) => c.op === "insert")).toBe(false);
  });
  it("never throws", async () => {
    expect(await awardOrderPoints({ from: () => { throw new Error("db down"); } }, "o1", null)).toBeNull();
  });
});

describe("reverseOrderPoints", () => {
  it("debits the refunded share, ignoring failed refunds", async () => {
    const { db, calls } = createFakeDb((c) => {
      if (c.table === "orders") return { data: order };
      if (c.table === "loyalty_ledger" && c.op === "select") return { data: [{ kind: "earn", points: 105 }] };
      if (c.table === "refunds") return { data: [{ amount_minor: 5_500_00, status: "succeeded" }, { amount_minor: 9_999_00, status: "failed" }] };
      return { data: null };
    });
    expect(await reverseOrderPoints(db, "o1", "admin-1")).toEqual({ points: 52 });
    expect(calls.find((c) => c.table === "loyalty_ledger" && c.op === "insert")!.payload).toMatchObject({ kind: "reverse", points: -52 });
  });
});

import { customerBalance, debitRedeemedPoints } from "@/lib/loyalty/service";
import { checkoutSchema } from "@/lib/validation/checkout";

describe("redemption at checkout", () => {
  it("reads balance from the ledger", async () => {
    const { db } = createFakeDb(() => ({ data: [{ points: 100, created_at: "2026-01-01" }, { points: -30, created_at: "2026-02-01" }] }));
    expect(await customerBalance(db, "c1", new Date("2026-03-01"))).toBe(70);
  });
  it("debits as a negative redeem row and audits", async () => {
    const { db, calls } = createFakeDb(() => ({ data: null }));
    expect(await debitRedeemedPoints(db, { customerId: "c1", orderId: "o1", points: 40, discountMinor: 40_00 })).toBe(true);
    expect(calls[0]).toMatchObject({ table: "loyalty_ledger", op: "insert", payload: { kind: "redeem", points: -40, order_id: "o1" } });
    expect(calls[1].payload).toMatchObject({ action: "loyalty.redeem" });
  });
  it("reports a failed debit", async () => {
    const { db } = createFakeDb(() => ({ error: { message: "boom" } }));
    expect(await debitRedeemedPoints(db, { customerId: "c1", orderId: "o1", points: 1, discountMinor: 100 })).toBe(false);
  });
  it("schema defaults to 0 and rejects fractions/negatives", () => {
    const base = { full_name: "Ann Perera", email: "a@example.test", phone: "0771234567", line1: "12 Main St", city: "Colombo" };
    expect(checkoutSchema.parse(base).loyalty_points).toBe(0);
    expect(checkoutSchema.safeParse({ ...base, loyalty_points: 1.5 }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, loyalty_points: -1 }).success).toBe(false);
  });
});
