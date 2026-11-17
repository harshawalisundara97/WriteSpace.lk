import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFakeDb, type FakeCall, type Responder } from "./helpers/fake-db";

const h = vi.hoisted(() => ({
  responder: null as unknown as Responder,
  calls: [] as FakeCall[],
  perm: vi.fn(async (_p: string): Promise<{ ok: true; ctx: { userId: string } } | { ok: false; error: string }> => ({ ok: true, ctx: { userId: "admin-1" } })),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/guards", () => ({ checkPerm: h.perm }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => { const { db, calls } = createFakeDb((c) => h.responder(c)); h.calls = calls; return db; },
}));

import { adjustLoyaltyPoints } from "@/lib/admin/customer-actions";
import { settingsSchema } from "@/lib/validation/admin";

const CID = "11111111-1111-4111-8111-111111111111";
const db = (balance: number): Responder => (c) => {
  if (c.table === "customers") return { data: { id: CID } };
  if (c.table === "loyalty_ledger" && c.op === "select") return { data: balance ? [{ points: balance, created_at: "2026-01-01" }] : [] };
  if (c.table === "store_settings") return { data: { loyalty_enabled: true } };
  return { data: null };
};

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon";
  vi.clearAllMocks();
});

describe("adjustLoyaltyPoints", () => {
  it("requires customers:write", async () => {
    h.perm.mockResolvedValueOnce({ ok: false, error: "no perm" });
    expect(await adjustLoyaltyPoints({ customer_id: CID, points: 10, note: "Goodwill" })).toEqual({ ok: false, error: "no perm" });
    expect(h.perm).toHaveBeenCalledWith("customers:write");
  });
  it("validates amount and reason", async () => {
    h.responder = db(0);
    expect((await adjustLoyaltyPoints({ customer_id: CID, points: 0, note: "Goodwill" })).ok).toBe(false);
    expect((await adjustLoyaltyPoints({ customer_id: CID, points: 5, note: "x" })).ok).toBe(false);
    expect((await adjustLoyaltyPoints({ customer_id: CID, points: 1.5, note: "Goodwill" })).ok).toBe(false);
  });
  it("credits with expiry and audits before/after balance", async () => {
    h.responder = db(40);
    expect(await adjustLoyaltyPoints({ customer_id: CID, points: 100, note: "Goodwill — late delivery" })).toEqual({ ok: true });
    const ins = h.calls.find((c) => c.table === "loyalty_ledger" && c.op === "insert")!;
    expect(ins.payload).toMatchObject({ kind: "adjust", points: 100, actor_id: "admin-1" });
    expect((ins.payload as { expires_at: string | null }).expires_at).not.toBeNull();
    expect(h.calls.find((c) => c.table === "audit_logs")!.payload).toMatchObject({
      action: "loyalty.adjust", before: { balance: 40 }, after: { points: 100, balance: 140 },
    });
  });
  it("refuses to debit more than the balance", async () => {
    h.responder = db(40);
    const r = await adjustLoyaltyPoints({ customer_id: CID, points: -50, note: "Correction" });
    expect(r).toEqual({ ok: false, error: "Customer only has 40 points" });
    expect(h.calls.some((c) => c.op === "insert")).toBe(false);
  });
});

describe("settings schema", () => {
  it("defaults loyalty to off with the agreed rates", () => {
    const s = settingsSchema.pick({ loyalty_enabled: true, loyalty_earn_per_minor: true, loyalty_point_value_minor: true, loyalty_max_redeem_pct: true, loyalty_expiry_months: true }).parse({});
    expect(settingsSchema.shape.loyalty_max_redeem_pct.safeParse(101).success).toBe(false);
    expect(s).toMatchObject({ loyalty_enabled: false, loyalty_earn_per_minor: 10000, loyalty_point_value_minor: 100, loyalty_max_redeem_pct: 50, loyalty_expiry_months: 12 });
  });
});
