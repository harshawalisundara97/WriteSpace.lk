import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/env";
import { demoDashboard, demoAdminOrderRows, demoAdminOrder } from "@/lib/demo/data";

const PAID_STATUSES = ["paid", "fulfilled", "shipped", "delivered"];

function delta(curr: number, prev: number): { value: string; positive: boolean } {
  if (prev === 0) return { value: curr > 0 ? "+100%" : "0%", positive: curr >= 0 };
  const pct = Math.round(((curr - prev) / prev) * 100);
  return { value: `${pct >= 0 ? "+" : ""}${pct}%`, positive: pct >= 0 };
}

export async function getDashboardMetrics(rangeDays = 7) {
  if (!hasSupabase()) return demoDashboard(rangeDays);
  const db = createAdminClient();
  const now = Date.now();
  const start = new Date(now - rangeDays * 86400_000).toISOString();
  const prevStart = new Date(now - 2 * rangeDays * 86400_000).toISOString();

  const { data: paidRows } = await db
    .from("orders").select("id,total_minor,created_at,currency,customer_id").in("status", PAID_STATUSES).gte("created_at", prevStart);
  const paid = paidRows ?? [];
  const cur = paid.filter((o) => o.created_at >= start);
  const prev = paid.filter((o) => o.created_at < start);
  const currency = paid[0]?.currency ?? "LKR";

  const revenue = cur.reduce((s, o) => s + o.total_minor, 0);
  const prevRevenue = prev.reduce((s, o) => s + o.total_minor, 0);
  const aov = cur.length ? Math.round(revenue / cur.length) : 0;
  const prevAov = prev.length ? Math.round(prevRevenue / prev.length) : 0;

  // Repeat-customer rate in the current window.
  const byCustomer = new Map<string, number>();
  for (const o of cur) if (o.customer_id) byCustomer.set(o.customer_id, (byCustomer.get(o.customer_id) ?? 0) + 1);
  const repeat = Array.from(byCustomer.values()).filter((n) => n >= 2).length;
  const repeatRate = byCustomer.size ? Math.round((repeat / byCustomer.size) * 100) : 0;

  // Daily revenue series across the range.
  const byDay = new Map<string, number>();
  for (let i = rangeDays - 1; i >= 0; i--) byDay.set(new Date(now - i * 86400_000).toISOString().slice(0, 10), 0);
  for (const o of cur) { const k = o.created_at.slice(0, 10); if (byDay.has(k)) byDay.set(k, (byDay.get(k) ?? 0) + o.total_minor); }
  const revenueSeries = Array.from(byDay.entries()).map(([date, minor]) => ({ date: date.slice(5), revenue: Math.round(minor / 100) }));

  // Revenue by category for current paid orders.
  const curIds = cur.map((o) => o.id);
  let categoryBreakdown: { name: string; revenue: number }[] = [];
  if (curIds.length) {
    const { data: items } = await db
      .from("order_items").select("line_total_minor,product:products(category:categories(name))").in("order_id", curIds);
    const catMap = new Map<string, number>();
    for (const it of (items ?? []) as unknown as { line_total_minor: number; product: { category: { name: string } | null } | null }[]) {
      const name = it.product?.category?.name ?? "Uncategorized";
      catMap.set(name, (catMap.get(name) ?? 0) + it.line_total_minor);
    }
    categoryBreakdown = Array.from(catMap.entries()).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue);
  }

  // Recent orders (any status).
  const { data: recentOrders } = await db
    .from("orders").select("id,order_number,status,total_minor,currency,created_at").order("created_at", { ascending: false }).limit(6);

  // Low stock.
  const { data: lowStock } = await db
    .from("inventory")
    .select("variant_id,on_hand,reserved,low_stock_threshold,variant:product_variants(sku,name,product:products(name))")
    .order("on_hand", { ascending: true }).limit(50);
  const low = (lowStock ?? []).filter((r) => r.on_hand - r.reserved <= r.low_stock_threshold).slice(0, 8);

  // Top products.
  const { data: soldItems } = await db.from("order_items").select("product_name,quantity").limit(2000);
  const qtyByName = new Map<string, number>();
  for (const it of soldItems ?? []) qtyByName.set(it.product_name, (qtyByName.get(it.product_name) ?? 0) + it.quantity);
  const topProducts = Array.from(qtyByName.entries()).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5);

  return {
    currency, range: rangeDays,
    kpis: {
      revenue: { value: revenue, delta: delta(revenue, prevRevenue) },
      orders: { value: cur.length, delta: delta(cur.length, prev.length) },
      aov: { value: aov, delta: delta(aov, prevAov) },
      repeatRate: { value: repeatRate, delta: delta(repeatRate, 0) },
    },
    revenueSeries, categoryBreakdown,
    recentOrders: (recentOrders ?? []) as { id: string; order_number: string; status: string; total_minor: number; currency: string; created_at: string }[],
    low, topProducts,
  };
}

export async function getAdminOrders(filter?: { status?: string; q?: string }) {
  if (!hasSupabase()) return demoAdminOrderRows();
  const db = createAdminClient();
  let query = db
    .from("orders")
    .select("id,order_number,email,status,total_minor,currency,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (filter?.status) query = query.eq("status", filter.status);
  if (filter?.q) query = query.or(`order_number.ilike.%${filter.q}%,email.ilike.%${filter.q}%`);
  const { data } = await query;
  return data ?? [];
}

export async function getAdminOrder(id: string) {
  if (!hasSupabase()) return demoAdminOrder(id);
  const db = createAdminClient();
  const { data: order } = await db.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) return null;
  const [{ data: items }, { data: payment }, { data: refunds }, { data: activity }] = await Promise.all([
    db.from("order_items").select("*").eq("order_id", id),
    db.from("payments").select("*").eq("order_id", id).maybeSingle(),
    db.from("refunds").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    db.from("audit_logs").select("id,action,after,created_at").eq("entity", "orders").eq("entity_id", id).order("created_at", { ascending: true }),
  ]);
  return { order, items: items ?? [], payment: payment ?? null, refunds: refunds ?? [], activity: activity ?? [] };
}

export interface AdminRefund {
  id: string; order_id: string; order_number: string; email: string;
  amount_minor: number; currency: string; reason: string | null;
  status: string; restocked: boolean; created_at: string;
}

export async function getAdminRefunds(): Promise<AdminRefund[]> {
  if (!hasSupabase()) {
    const { demoAdminRefunds } = await import("@/lib/demo/data");
    return demoAdminRefunds();
  }
  const db = createAdminClient();
  const { data } = await db
    .from("refunds")
    .select("id,order_id,amount_minor,reason,status,restocked,created_at,order:orders(order_number,email,currency)")
    .order("created_at", { ascending: false })
    .limit(300);
  type Row = {
    id: string; order_id: string; amount_minor: number; reason: string | null;
    status: string; restocked: boolean; created_at: string;
    order: { order_number: string | null; email: string | null; currency: string | null } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    order_id: r.order_id,
    order_number: r.order?.order_number ?? "—",
    email: r.order?.email ?? "—",
    amount_minor: r.amount_minor,
    currency: r.order?.currency ?? "LKR",
    reason: r.reason,
    status: r.status,
    restocked: r.restocked,
    created_at: r.created_at,
  }));
}
