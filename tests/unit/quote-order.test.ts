import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFakeDb, type FakeCall, type Responder } from "./helpers/fake-db";
import { canTransition, commitsStockBeforePayment } from "@/lib/orders/state-machine";

const h = vi.hoisted(() => ({
  responder: null as unknown as Responder,
  rpc: vi.fn(async (_n: string, _a: unknown): Promise<{ error: { message: string } | null }> => ({ error: null })),
  perm: vi.fn(async (_p: string): Promise<{ ok: true; ctx: { userId: string } } | { ok: false; error: string }> => ({ ok: true, ctx: { userId: "admin-1" } })),
  confirm: vi.fn(async (_d: unknown) => {}),
  staff: vi.fn(async () => {}),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/guards", () => ({ checkPerm: h.perm }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ ...createFakeDb((c) => h.responder(c)).db, rpc: h.rpc }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) }));
vi.mock("@/lib/email/order", () => ({ sendOrderConfirmation: h.confirm }));
vi.mock("@/lib/email/quote", () => ({ sendQuotePriced: vi.fn(), sendQuoteRequestEmails: vi.fn(), sendQuoteAcceptedStaff: h.staff }));
vi.mock("@/lib/catalog/queries", () => ({ getStoreSettings: async () => ({ currency: "LKR", support_email: "shop@example.test" }) }));
vi.mock("@/lib/cart/actions", () => ({ getCartLines: async () => [] }));

import { convertQuoteToOrder } from "@/lib/admin/quote-actions";
import { acceptQuote } from "@/lib/quotes/actions";
import { markInvoicePaid } from "@/lib/admin/order-actions";

let calls: FakeCall[];
const TOKEN = "a".repeat(64);
const future = new Date(Date.now() + 5 * 86400_000).toISOString();
const quote = (over: Record<string, unknown> = {}) => ({
  id: "q1", quote_number: "Q-1", status: "accepted", customer_id: "c1", email: "buyer@example.test", contact_name: "Ann", company: "Royal",
  shipping_minor: 1000_00, po_number: "PO-9", valid_until: future, total_minor: 0,
  delivery_address: { line1: "1 Main St", city: "Kandy", phone: "0771234567" }, ...over,
});
const items = [
  { variant_id: "v1", name: "Pens", sku: "P", qty: 200, list_unit_minor: 100_00, quoted_unit_minor: 90_00 },
  { variant_id: "v2", name: "Books", sku: "B", qty: 10, list_unit_minor: 500_00, quoted_unit_minor: null },
];
const db = (q: Record<string, unknown>, extra: Responder = () => ({ data: null })): Responder => (c) => {
  calls.push(c);
  if (c.table === "quotes" && c.op === "select") return { data: q };
  if (c.table === "quote_items") return { data: items };
  if (c.table === "orders" && c.op === "insert") return { data: { id: "o1", order_number: "WS-1", total_minor: (c.payload as { total_minor: number }).total_minor } };
  return extra(c);
};
const find = (t: string, op: FakeCall["op"]) => calls.find((c) => c.table === t && c.op === op)?.payload as Record<string, unknown>;

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon";
  calls = [];
  vi.clearAllMocks();
});

describe("invoice order state machine", () => {
  it("allows fulfil before payment, paying up front, and restocks on cancel", () => {
    expect(canTransition("pending_payment", "fulfilled", "invoice")).toBe(true);
    expect(canTransition("pending_payment", "paid", "invoice")).toBe(true);
    expect(canTransition("shipped", "cancelled", "invoice")).toBe(true);
    expect(canTransition("pending_payment", "fulfilled", "online")).toBe(false);
    expect(commitsStockBeforePayment("invoice")).toBe(true);
    expect(commitsStockBeforePayment("online")).toBe(false);
  });
});

describe("convertQuoteToOrder", () => {
  it("commits stock and creates an unpaid invoice order at quoted prices", async () => {
    h.responder = db(quote());
    expect(await convertQuoteToOrder("q1")).toEqual({ ok: true, orderId: "o1" });
    expect(h.rpc.mock.calls.map((c) => c[0])).toEqual(["reserve_stock", "commit_stock"]);
    expect(find("orders", "insert")).toMatchObject({
      payment_method: "invoice", status: "pending_payment", quote_id: "q1", po_number: "PO-9",
      subtotal_minor: 200 * 90_00 + 10 * 500_00, total_minor: 200 * 90_00 + 10 * 500_00 + 1000_00,
      shipping_address: expect.objectContaining({ line1: "1 Main St", company: "Royal" }),
    });
    expect((calls.find((c) => c.table === "order_items")!.payload as { unit_price_minor: number }[]).map((i) => i.unit_price_minor)).toEqual([90_00, 500_00]);
    expect(find("payments", "insert")).toMatchObject({ provider: "invoice", status: "requires_payment" });
    expect(find("quotes", "update")).toMatchObject({ status: "converted", order_id: "o1" });
    expect(h.confirm).toHaveBeenCalled();
  });
  it("refuses non-accepted quotes and short stock without creating anything", async () => {
    h.responder = db(quote({ status: "priced" }));
    expect((await convertQuoteToOrder("q1")).ok).toBe(false);
    h.responder = db(quote());
    h.rpc.mockResolvedValueOnce({ error: { message: "P0001" } });
    expect(await convertQuoteToOrder("q1")).toEqual({ ok: false, error: "Not enough stock for this quote — adjust inventory first" });
    expect(calls.some((c) => c.table === "orders")).toBe(false);
  });
  it("puts stock back if the order insert fails", async () => {
    h.responder = db(quote(), (c) => (c.table === "orders" ? { error: { message: "x" } } : { data: null }));
    const base = h.responder;
    h.responder = (c) => (c.table === "orders" && c.op === "insert" ? (calls.push(c), { error: { message: "x" } }) : base(c));
    expect((await convertQuoteToOrder("q1")).ok).toBe(false);
    expect(h.rpc.mock.calls.map((c) => c[0])).toContain("restock");
  });
});

describe("acceptQuote", () => {
  const form = { token: TOKEN, line1: "1 Main St", city: "Kandy", phone: "0771234567", po_number: "PO-9" };
  it("accepts a priced quote once, storing address + PO, and tells staff", async () => {
    h.responder = db(quote({ status: "priced" }), (c) => (c.table === "quotes" && c.op === "update" ? { data: { id: "q1" } } : { data: null }));
    expect(await acceptQuote(form)).toEqual({ ok: true });
    const upd = calls.find((c) => c.table === "quotes" && c.op === "update")!;
    expect(upd.payload).toMatchObject({ status: "accepted", po_number: "PO-9", delivery_address: expect.objectContaining({ city: "Kandy" }) });
    expect(upd.filters).toContainEqual(["status", "priced"]);
    expect(h.staff).toHaveBeenCalledWith("shop@example.test", expect.objectContaining({ poNumber: "PO-9" }));
  });
  it("rejects expired quotes, races and bad tokens", async () => {
    h.responder = db(quote({ status: "priced", valid_until: "2020-01-01" }));
    expect(await acceptQuote(form)).toEqual({ ok: false, error: "This quote has expired" });
    h.responder = db(quote({ status: "priced" })); // update matches no row → lost race
    expect(await acceptQuote(form)).toEqual({ ok: false, error: "This quote can't be accepted" });
    expect((await acceptQuote({ ...form, token: "nope" })).ok).toBe(false);
  });
});

describe("markInvoicePaid", () => {
  it("records payment and moves an unshipped order to paid", async () => {
    h.responder = (c) => { calls.push(c); return c.table === "orders" && c.op === "select" ? { data: { status: "pending_payment", payment_method: "invoice", total_minor: 100 } } : { data: c.table === "payments" && c.op === "select" ? { status: "requires_payment" } : null }; };
    expect(await markInvoicePaid("o1")).toEqual({ ok: true });
    expect(find("payments", "update")).toEqual({ status: "succeeded" });
    expect(find("orders", "update")).toEqual({ status: "paid" });
  });
  it("only for unpaid invoice orders", async () => {
    h.responder = (c) => ({ data: c.table === "orders" ? { status: "paid", payment_method: "online" } : null });
    expect((await markInvoicePaid("o1")).error).toBe("Not an invoice order");
    h.responder = (c) => ({ data: c.table === "orders" ? { status: "shipped", payment_method: "invoice" } : { status: "succeeded" } });
    expect((await markInvoicePaid("o1")).error).toBe("Already marked paid");
  });
});
