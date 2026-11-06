import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/env";
import { demoDashboard } from "@/lib/demo/data";

const PAID_STATUSES = ["paid", "fulfilled", "shipped", "delivered"];

export async function getDashboardMetrics() {
  if (!hasSupabase()) return demoDashboard();
  const db = createAdminClient();
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startWeek = new Date(now.getTime() - 7 * 86400_000).toISOString();

  const { data: paidOrders } = await db
    .from("orders").select("total_minor,created_at,currency").in("status", PAID_STATUSES);

  const orders = paidOrders ?? [];
  const revenue = orders.reduce((s, o) => s + o.total_minor, 0);
  const ordersToday = orders.filter((o) => o.created_at >= startToday).length;
  const ordersWeek = orders.filter((o) => o.created_at >= startWeek).length;
  const aov = orders.length ? Math.round(revenue / orders.length) : 0;
  const currency = orders[0]?.currency ?? "LKR";

  // Revenue per day for the last 7 days (for the chart).
  const byDay = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400_000);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const o of orders) {
    const key = o.created_at.slice(0, 10);
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + o.total_minor);
  }
  const revenueSeries = Array.from(byDay.entries()).map(([date, minor]) => ({
    date: date.slice(5),
    revenue: Math.round(minor / 100),
  }));

  // Low stock.
  const { data: lowStock } = await db
    .from("inventory")
    .select("variant_id,on_hand,reserved,low_stock_threshold,variant:product_variants(sku,name,product:products(name))")
    .order("on_hand", { ascending: true })
    .limit(50);
  const low = (lowStock ?? []).filter((r) => r.on_hand - r.reserved <= r.low_stock_threshold).slice(0, 8);

  // Top products by quantity sold.
  const { data: soldItems } = await db.from("order_items").select("product_name,quantity").limit(2000);
  const qtyByName = new Map<string, number>();
  for (const it of soldItems ?? []) qtyByName.set(it.product_name, (qtyByName.get(it.product_name) ?? 0) + it.quantity);
  const topProducts = Array.from(qtyByName.entries())
    .map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5);

  return { revenue, currency, ordersToday, ordersWeek, aov, totalOrders: orders.length, revenueSeries, low, topProducts };
}

export async function getAdminOrders(filter?: { status?: string; q?: string }) {
  if (!hasSupabase()) return [];
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
  if (!hasSupabase()) return null;
  const db = createAdminClient();
  const { data: order } = await db.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) return null;
  const [{ data: items }, { data: payment }, { data: refunds }] = await Promise.all([
    db.from("order_items").select("*").eq("order_id", id),
    db.from("payments").select("*").eq("order_id", id).maybeSingle(),
    db.from("refunds").select("*").eq("order_id", id).order("created_at", { ascending: false }),
  ]);
  return { order, items: items ?? [], payment: payment ?? null, refunds: refunds ?? [] };
}
