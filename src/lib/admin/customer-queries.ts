import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const PAID = ["paid", "fulfilled", "shipped", "delivered"];

export async function getAdminCustomers() {
  const db = createAdminClient();
  const { data: customers } = await db
    .from("customers").select("id,email,full_name,phone,is_blocked,created_at")
    .order("created_at", { ascending: false }).limit(200);
  const { data: orders } = await db.from("orders").select("customer_id,total_minor,status");
  const stats = new Map<string, { count: number; spent: number }>();
  for (const o of orders ?? []) {
    if (!o.customer_id) continue;
    const s = stats.get(o.customer_id) ?? { count: 0, spent: 0 };
    s.count++;
    if (PAID.includes(o.status)) s.spent += o.total_minor;
    stats.set(o.customer_id, s);
  }
  return (customers ?? []).map((c) => ({ ...c, orders: stats.get(c.id)?.count ?? 0, spent: stats.get(c.id)?.spent ?? 0 }));
}

export async function getAdminCustomer(id: string) {
  const db = createAdminClient();
  const { data: customer } = await db.from("customers").select("*").eq("id", id).maybeSingle();
  if (!customer) return null;
  const { data: orders } = await db
    .from("orders").select("id,order_number,status,total_minor,currency,created_at")
    .eq("customer_id", id).order("created_at", { ascending: false });
  return { customer, orders: orders ?? [] };
}
