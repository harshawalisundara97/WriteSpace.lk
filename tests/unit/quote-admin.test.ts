import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFakeDb, type FakeCall, type Responder } from "./helpers/fake-db";

const h = vi.hoisted(() => ({
  responder: null as unknown as Responder,
  calls: [] as FakeCall[],
  perm: vi.fn(async (_p: string): Promise<{ ok: true; ctx: { userId: string } } | { ok: false; error: string }> => ({ ok: true, ctx: { userId: "admin-1" } })),
  priced: vi.fn(async (_d: unknown) => {}),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/guards", () => ({ checkPerm: h.perm }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => createFakeDb((c) => h.responder(c)).db,
}));
vi.mock("@/lib/email/quote", async (orig) => ({ ...(await orig<typeof import("@/lib/email/quote")>()), sendQuotePriced: h.priced }));

import { saveQuotePrices, sendQuote, declineQuote } from "@/lib/admin/quote-actions";
import { renderQuotePriced } from "@/lib/email/quote";
import { isQuoteToken } from "@/lib/quotes/rules";

const Q = "11111111-1111-4111-8111-111111111111";
const L1 = "22222222-2222-4222-8222-222222222222";
const L2 = "33333333-3333-4333-8333-333333333333";
let status = "requested";
let calls: FakeCall[] = [];

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon";
  status = "requested";
  calls = [];
  h.calls = calls;
  h.responder = (c) => {
    calls.push(c);
    if (c.table === "quotes" && c.op === "select") return { data: { id: Q, quote_number: "Q-1", status, email: "a@example.test", contact_name: "Ann", access_token: "t".repeat(64) } };
    if (c.table === "quote_items" && c.op === "select") return { data: [
      { id: L1, name: "Pens", sku: "P", qty: 100, list_unit_minor: 100_00 },
      { id: L2, name: "Books", sku: "B", qty: 10, list_unit_minor: 500_00 },
    ] };
    return { data: null };
  };
  vi.clearAllMocks();
});

const input = (p1: number | null, p2: number | null) => ({
  quote_id: Q, lines: [{ id: L1, quoted_unit_minor: p1 }, { id: L2, quoted_unit_minor: p2 }], shipping_minor: 1000_00, valid_days: 14, admin_notes: "",
});
const quoteUpdate = () => calls.find((c) => c.table === "quotes" && c.op === "update")?.payload as Record<string, unknown> | undefined;

describe("admin quote pricing", () => {
  it("requires orders:write", async () => {
    h.perm.mockResolvedValueOnce({ ok: false, error: "no perm" });
    expect(await sendQuote(input(1, 1))).toEqual({ ok: false, error: "no perm" });
    expect(h.perm).toHaveBeenCalledWith("orders:write");
  });
  it("saves a partial draft without changing status or emailing", async () => {
    expect(await saveQuotePrices(input(90_00, null))).toEqual({ ok: true });
    expect(quoteUpdate()).toMatchObject({ subtotal_minor: 100 * 90_00 + 10 * 500_00, total_minor: 100 * 90_00 + 10 * 500_00 + 1000_00 });
    expect(quoteUpdate()).not.toHaveProperty("status");
    expect(h.priced).not.toHaveBeenCalled();
  });
  it("refuses to send with an unpriced line", async () => {
    const r = await sendQuote(input(90_00, null));
    expect(r).toEqual({ ok: false, error: "Line 2 has no price" });
    expect(calls.some((c) => c.op === "update")).toBe(false);
  });
  it("sends: priced status, validity, audit and email with view link", async () => {
    expect(await sendQuote(input(90_00, 450_00))).toEqual({ ok: true });
    expect(quoteUpdate()).toMatchObject({ status: "priced", total_minor: 9000_00 + 4500_00 + 1000_00 });
    expect(quoteUpdate()!.valid_until).toBeTypeOf("string");
    expect(calls.find((c) => c.table === "audit_logs")!.payload).toMatchObject({ action: "quote.sent", before: { status: "requested" } });
    expect(h.priced).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringMatching(/\/quote\/view\/t{64}$/), savingsMinor: 1500_00 }));
  });
  it("blocks re-pricing accepted/converted quotes and rejects negatives", async () => {
    status = "accepted";
    expect((await sendQuote(input(1, 1))).error).toMatch(/can't be re-priced/);
    status = "requested";
    expect((await sendQuote(input(-1, 1))).ok).toBe(false);
  });
  it("declines open quotes only", async () => {
    expect(await declineQuote(Q)).toEqual({ ok: true });
    status = "converted";
    expect((await declineQuote(Q)).ok).toBe(false);
  });
});

describe("quote email + token", () => {
  it("renders prices, savings, validity and escapes names", () => {
    const { subject, html } = renderQuotePriced({
      to: "a@example.test", contactName: "<b>Ann</b> P", quoteNumber: "Q-1",
      items: [{ name: "Pens", sku: "P", qty: 100, unitMinor: 90_00, listUnitMinor: 100_00 }],
      shippingMinor: 0, totalMinor: 9000_00, savingsMinor: 1000_00, validUntil: new Date("2026-12-01T00:00:00Z"), url: "https://x.test/quote/view/abc",
    });
    expect(subject).toBe("Your quote Q-1 is ready");
    expect(html).toContain("&lt;b&gt;Ann&lt;/b&gt;");
    expect(html).toContain("1 December 2026");
    expect(html).toContain("You save");
  });
  it("validates token shape", () => {
    expect(isQuoteToken("a".repeat(64))).toBe(true);
    expect(isQuoteToken("a".repeat(63))).toBe(false);
    expect(isQuoteToken("' or 1=1")).toBe(false);
  });
});
