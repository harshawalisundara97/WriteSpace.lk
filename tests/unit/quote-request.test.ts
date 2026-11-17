import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFakeDb, type FakeCall, type Responder } from "./helpers/fake-db";
import { buildQuoteItems, QUOTE_MAX_QTY } from "@/lib/quotes/rules";

const h = vi.hoisted(() => ({
  responder: null as unknown as Responder,
  calls: [] as FakeCall[],
  lines: [] as unknown[],
  emails: vi.fn(async () => {}),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/cart/actions", () => ({ getCartLines: async () => h.lines }));
vi.mock("@/lib/catalog/queries", () => ({ getStoreSettings: async () => ({ currency: "LKR", support_email: "shop@example.test" }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } }) }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => { const { db, calls } = createFakeDb((c) => h.responder(c)); h.calls = calls; return db; },
}));
vi.mock("@/lib/email/quote", () => ({ sendQuoteRequestEmails: h.emails }));

import { requestQuote } from "@/lib/quotes/actions";

const line = (id: string, qty: number, price = 100_00) => ({
  variant_id: id, product_id: "p", product_name: "Gel Pens", product_slug: "gel", variant_name: id === "v2" ? "Blue" : null,
  sku: `SKU-${id}`, image: null, unit_price_minor: price, compare_at_minor: null, quantity: qty, available: 5,
});
const form = { contact_name: "Ann Perera", email: "ann@example.test", company: "Royal School" };

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon";
  h.calls = [];
  h.lines = [line("v1", 2), line("v2", 3, 50_00)];
  h.responder = (c) => (c.table === "quotes" && c.op === "insert" ? { data: { id: "q1" } } : { data: null });
  vi.clearAllMocks();
});

describe("buildQuoteItems", () => {
  it("snapshots cart lines, applies overrides beyond stock, drops zeros, clamps", () => {
    const items = buildQuoteItems([line("v1", 2), line("v2", 3)], { v1: 500, v2: 0, vX: 9 });
    expect(items).toEqual([{ variant_id: "v1", name: "Gel Pens", sku: "SKU-v1", qty: 500, list_unit_minor: 100_00, quoted_unit_minor: null }]);
    expect(buildQuoteItems([line("v1", 1)], { v1: 10 ** 9 })[0].qty).toBe(QUOTE_MAX_QTY);
    expect(buildQuoteItems([line("v2", 1)])[0].name).toBe("Gel Pens — Blue");
  });
});

describe("requestQuote", () => {
  it("stores quote + items, audits and emails", async () => {
    const r = await requestQuote({ ...form, qtys: { v1: 200 } });
    expect(r.ok && r.quoteNumber).toMatch(/^Q-\d{8}-[0-9A-F]{4}$/);
    const q = h.calls.find((c) => c.table === "quotes" && c.op === "insert")!;
    expect(q.payload).toMatchObject({ status: "requested", customer_id: "u1", company: "Royal School", subtotal_minor: 200 * 100_00 + 3 * 50_00 });
    const items = h.calls.find((c) => c.table === "quote_items")!.payload as { quote_id: string; qty: number }[];
    expect(items.map((i) => [i.quote_id, i.qty])).toEqual([["q1", 200], ["q1", 3]]);
    expect(h.calls.some((c) => c.table === "audit_logs")).toBe(true);
    expect(h.emails).toHaveBeenCalledWith(expect.objectContaining({ adminUrl: expect.stringContaining("/admin/quotes/q1") }), "shop@example.test");
  });
  it("rejects an empty cart and bad input", async () => {
    h.lines = [];
    expect(await requestQuote(form)).toEqual({ ok: false, error: "Add items to your cart before requesting a quote" });
    expect((await requestQuote({ ...form, email: "nope" })).ok).toBe(false);
  });
  it("silently drops honeypot submissions", async () => {
    expect((await requestQuote({ ...form, website: "spam" })).ok).toBe(true);
    expect(h.calls).toHaveLength(0);
    expect(h.emails).not.toHaveBeenCalled();
  });
  it("rolls back the quote if items fail", async () => {
    h.responder = (c) => c.table === "quotes" && c.op === "insert" ? { data: { id: "q1" } }
      : c.table === "quote_items" ? { error: { message: "x" } } : { data: null };
    expect((await requestQuote(form)).ok).toBe(false);
    expect(h.calls.some((c) => c.table === "quotes" && c.op === "delete")).toBe(true);
    expect(h.emails).not.toHaveBeenCalled();
  });
});
