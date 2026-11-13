import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { demoAdminOrderRows, demoAdminOrder } from "@/lib/demo/data";

// Uses the user-scoped client; RLS limits results to the signed-in customer.
export async function getMyOrders() {
  if (!hasSupabase()) return demoAdminOrderRows();
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id,order_number,status,total_minor,currency,created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getMyOrder(id: string) {
  if (!hasSupabase()) {
    const d = demoAdminOrder(id);
    return d ? { order: d.order, items: d.items } : null;
  }
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id,order_number,status,subtotal_minor,discount_minor,shipping_minor,tax_minor,total_minor,currency,shipping_address,delivery_method,tracking_number,created_at,placed_at")
    .eq("id", id)
    .maybeSingle();
  if (!order) return null;
  const { data: items } = await supabase
    .from("order_items")
    .select("product_name,sku,quantity,unit_price_minor,line_total_minor,variant_id")
    .eq("order_id", id);
  return { order, items: items ?? [] };
}
