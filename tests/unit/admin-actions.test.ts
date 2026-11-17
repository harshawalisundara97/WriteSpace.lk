import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createFakeDb, type FakeCall, type Responder } from "./helpers/fake-db";

const h = vi.hoisted(() => ({
  responder: null as unknown as Responder,
  calls: [] as FakeCall[],
  perm: vi.fn(async (_p: string): Promise<{ ok: true; ctx: unknown } | { ok: false; error: string }> => ({ ok: true, ctx: { userId: "admin-1", role: "admin", permissions: [] } })),
  shipped: vi.fn(async () => {}),
  refunded: vi.fn(async () => {}),
  gatewayRefund: vi.fn(async () => ({ providerRefundId: "re_1", status: "succeeded" })),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/guards", () => ({ checkPerm: h.perm }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    const { db, calls } = createFakeDb((c) => h.responder(c));
    h.calls = calls;
    return { ...db, rpc: vi.fn(async () => ({ data: null, error: null })) };
  },
}));
vi.mock("@/lib/email/order", () => ({ sendOrderShipped: h.shipped, sendOrderRefunded: h.refunded }));
vi.mock("@/lib/payments", () => ({ getPaymentProvider: () => ({ refund: h.gatewayRefund }) }));

import { importProductsCsv } from "@/lib/admin/csv-actions";
import { transitionOrder, createRefund } from "@/lib/admin/order-actions";
import { saveBundle, setBundleStatus, deleteBundle } from "@/lib/admin/bundle-actions";

const of = (table: string, op?: FakeCall["op"]) =>
  h.calls.filter((c) => c.table === table && (!op || c.op === op));

const env = { ...process.env };
beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon";
  h.responder = () => ({ data: null });
  h.calls = [];
  vi.clearAllMocks();
});
afterEach(() => { process.env = { ...env }; });

describe("permission enforcement", () => {
  it("returns { ok:false } on a permission refusal without touching the DB", async () => {
    h.perm.mockResolvedValueOnce({ ok: false, error: "no perm" });
    expect(await deleteBundle("b1")).toEqual({ ok: false, error: "no perm" });
    h.perm.mockResolvedValueOnce({ ok: false, error: "no perm" });
    expect(await importProductsCsv("slug,sku\na,b")).toEqual({ ok: false, error: "no perm", created: 0, updated: 0 });
    expect(h.calls).toHaveLength(0);
  });

  it("each action checks the right permission", async () => {
    await importProductsCsv("slug,sku\n");
    await transitionOrder("o1", "paid");
    await createRefund({ orderId: "o1", amountMinor: 1, reason: "", restock: false });
    await setBundleStatus("b1", "draft");
    expect(h.perm.mock.calls.map((c) => c[0])).toEqual([
      "products:write", "orders:write", "refunds:create", "products:write",
    ]);
  });
});

describe("importProductsCsv", () => {
  it("rejects a CSV with no data rows", async () => {
    expect(await importProductsCsv("slug,sku,name")).toMatchObject({ ok: false, error: "No rows found" });
  });

  it("creates new products, updates existing ones, upserts variants + inventory", async () => {
    h.responder = (c) => {
      if (c.table === "products" && c.op === "select")
        return { data: c.filters[0][1] === "old-pen" ? { id: "p-old" } : null };
      if (c.table === "products" && c.op === "insert") return { data: { id: "p-new" } };
      if (c.table === "product_variants") return { data: { id: "v-" + (c.payload as { sku: string }).sku } };
      return { data: null };
    };
    const csv = [
      "slug,sku,name,variant_name,price,compare_at,stock,age_group,status",
      'new-book,NB-1,"Book, Ruled",A5,250.50,300,10,kids,published',
      "new-book,NB-2,Book,A4,300,,5,kids,published",
      "old-pen,OP-1,Pen,,99,,0,bogus,weird",
      ",SKIPPED,No slug,,1,,1,all,draft",
    ].join("\n");

    const r = await importProductsCsv(csv);
    expect(r).toEqual({ ok: true, created: 1, updated: 1 });

    const inserted = of("products", "insert")[0].payload as Record<string, unknown>;
    expect(inserted).toMatchObject({ name: "Book, Ruled", slug: "new-book", age_group: "kids", status: "published" });
    const updated = of("products", "update")[0].payload as Record<string, unknown>;
    expect(updated).toMatchObject({ slug: "old-pen", age_group: "all", status: "draft" });

    const variants = of("product_variants", "upsert").map((c) => c.payload as Record<string, unknown>);
    expect(variants.map((v) => v.sku)).toEqual(["NB-1", "NB-2", "OP-1"]);
    expect(variants[0]).toMatchObject({ product_id: "p-new", price_minor: 25050, compare_at_minor: 30000, name: "A5" });
    expect(variants[1].compare_at_minor).toBeNull();
    expect(variants[2]).toMatchObject({ product_id: "p-old", name: null });

    const inv = of("inventory", "upsert").map((c) => c.payload);
    expect(inv).toEqual([
      { variant_id: "v-NB-1", on_hand: 10 },
      { variant_id: "v-NB-2", on_hand: 5 },
      { variant_id: "v-OP-1", on_hand: 0 },
    ]);
    expect(of("audit_logs", "insert")[0].payload).toMatchObject({ action: "products.import", actor: "admin-1" });
  });
});

describe("transitionOrder", () => {
  const order = (status: string) => (c: FakeCall) =>
    c.table === "orders" && c.op === "select"
      ? { data: { status, order_number: "WS-1", email: "a@example.test", total_minor: 1000, currency: "LKR", tracking_number: "TR1" } }
      : { data: null };

  it("returns not found for a missing order", async () => {
    expect(await transitionOrder("o1", "paid")).toEqual({ ok: false, error: "Order not found" });
  });

  it("rejects an illegal transition without writing", async () => {
    h.responder = order("pending_payment");
    const r = await transitionOrder("o1", "shipped");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Invalid order transition/);
    expect(of("orders", "update")).toHaveLength(0);
    expect(of("audit_logs")).toHaveLength(0);
  });

  it("applies a legal transition, audits it and emails on ship", async () => {
    h.responder = order("fulfilled");
    expect(await transitionOrder("o1", "shipped")).toEqual({ ok: true });
    expect(of("orders", "update")[0].payload).toEqual({ status: "shipped" });
    expect(of("audit_logs", "insert")[0].payload).toMatchObject({
      before: { status: "fulfilled" }, after: { status: "shipped" },
    });
    expect(h.shipped).toHaveBeenCalledWith(expect.objectContaining({ orderNumber: "WS-1", trackingNumber: "TR1" }));
  });

  it("does not email for non-ship transitions", async () => {
    h.responder = order("pending_payment");
    await transitionOrder("o1", "paid");
    expect(h.shipped).not.toHaveBeenCalled();
  });
});

describe("createRefund", () => {
  const base = (c: FakeCall) => {
    if (c.table === "orders" && c.op === "select")
      return { data: { id: "o1", status: "paid", total_minor: 1000, currency: "LKR", order_number: "WS-1", email: null } };
    if (c.table === "payments" && c.op === "select") return { data: { id: "pay1", provider_payment_id: "pi_1", provider: "stripe" } };
    if (c.table === "refunds" && c.op === "insert") return { data: { id: "r1" } };
    return { data: null };
  };

  it("rejects out-of-range amounts", async () => {
    h.responder = base;
    for (const amountMinor of [0, -5, 1001]) {
      expect(await createRefund({ orderId: "o1", amountMinor, reason: "", restock: false }))
        .toEqual({ ok: false, error: "Refund amount is out of range" });
    }
    expect(h.gatewayRefund).not.toHaveBeenCalled();
  });

  it("partial refund marks order partially_refunded", async () => {
    h.responder = base;
    expect(await createRefund({ orderId: "o1", amountMinor: 400, reason: "", restock: false })).toEqual({ ok: true });
    expect(of("orders", "update")[0].payload).toEqual({ status: "partially_refunded" });
  });

  it("full refund marks order refunded", async () => {
    h.responder = base;
    await createRefund({ orderId: "o1", amountMinor: 1000, reason: "", restock: false });
    expect(of("orders", "update")[0].payload).toEqual({ status: "refunded" });
  });

  it("gateway failure marks the refund failed and leaves the order alone", async () => {
    h.responder = base;
    h.gatewayRefund.mockRejectedValueOnce(new Error("card_declined"));
    expect(await createRefund({ orderId: "o1", amountMinor: 400, reason: "", restock: false }))
      .toEqual({ ok: false, error: "card_declined" });
    expect(of("refunds", "update")[0].payload).toEqual({ status: "failed" });
    expect(of("orders", "update")).toHaveLength(0);
  });
});

describe("bundle CRUD", () => {
  const U1 = "11111111-1111-1111-1111-111111111111";
  const valid = { name: "Grade 1 Starter", slug: "grade-1-starter", items: [{ product_id: U1, quantity: 2 }] };

  it("returns the demo message without writing when Supabase is off", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const r = await saveBundle(valid);
    expect(r.ok).toBe(false);
    expect(h.calls).toHaveLength(0);
  });

  it("rejects invalid input", async () => {
    const r = await saveBundle({ ...valid, slug: "Not A Slug" });
    expect(r.ok).toBe(false);
    expect(of("bundles")).toHaveLength(0);
  });

  it("creates a bundle and replaces its items", async () => {
    h.responder = (c) => (c.table === "bundles" && c.op === "insert" ? { data: { id: "b-new" } } : { data: null });
    expect(await saveBundle(valid)).toEqual({ ok: true, id: "b-new" });
    expect(of("bundle_items", "delete")[0].filters).toEqual([["bundle_id", "b-new"]]);
    expect(of("bundle_items", "insert")[0].payload).toEqual([
      expect.objectContaining({ bundle_id: "b-new", product_id: U1, quantity: 2 }),
    ]);
    expect(of("audit_logs", "insert")[0].payload).toMatchObject({ action: "bundle.create" });
  });

  it("updates an existing bundle", async () => {
    const id = "44444444-4444-4444-4444-444444444444";
    expect(await saveBundle({ ...valid, id })).toEqual({ ok: true, id });
    expect(of("bundles", "update")[0].filters).toEqual([["id", id]]);
    expect(of("audit_logs", "insert")[0].payload).toMatchObject({ action: "bundle.update" });
  });

  it("surfaces DB errors", async () => {
    h.responder = (c) => (c.table === "bundles" ? { error: { message: "duplicate slug" } } : { data: null });
    expect(await saveBundle(valid)).toEqual({ ok: false, error: "duplicate slug" });
    expect(of("bundle_items")).toHaveLength(0);
  });

  it("sets status and deletes with audit entries", async () => {
    expect(await setBundleStatus("b1", "draft")).toEqual({ ok: true });
    expect(of("bundles", "update")[0].payload).toEqual({ status: "draft" });
    expect(await deleteBundle("b1")).toEqual({ ok: true });
    expect(of("bundles", "delete")[0].filters).toEqual([["id", "b1"]]);
    expect(of("audit_logs", "insert")[0].payload).toMatchObject({ action: "bundle.delete" });
  });
});
