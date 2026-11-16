import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/env";
import { demoOrders } from "@/lib/demo/data";
import { buildSalesReport, windowBounds, REPORT_PAID_STATUSES, type DateWindow, type ReportItem, type ReportOrder, type SalesReport } from "./reports";

export async function getSalesReport(w: DateWindow): Promise<SalesReport> {
  if (!hasSupabase()) {
    const items: ReportItem[] = demoOrders.flatMap((o) => o.items.map((it) => ({ ...it, order_id: o.id })));
    return buildSalesReport(demoOrders, items, w);
  }
  const db = createAdminClient();
  const { start, end } = windowBounds(w);
  const { data: orders, error } = await db
    .from("orders")
    .select("id,status,created_at,currency,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor")
    .in("status", [...REPORT_PAID_STATUSES]).gte("created_at", start).lt("created_at", end);
  if (error) throw new Error(error.message);
  const rows = (orders ?? []) as ReportOrder[];
  let items: ReportItem[] = [];
  if (rows.length) {
    const { data, error: e2 } = await db
      .from("order_items").select("order_id,product_name,sku,quantity,line_total_minor").in("order_id", rows.map((o) => o.id));
    if (e2) throw new Error(e2.message);
    items = (data ?? []) as ReportItem[];
  }
  return buildSalesReport(rows, items, w);
}
