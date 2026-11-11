"use server";

import { createClient } from "@/lib/supabase/server";
import { addToCart } from "@/lib/cart/actions";

// Re-add all still-available line items from a past order to the cart.
export async function reorder(orderId: string): Promise<{ ok: boolean; added: number; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, added: 0, error: "Please sign in" };

  // RLS ensures this order belongs to the user.
  const { data: order } = await supabase.from("orders").select("id").eq("id", orderId).maybeSingle();
  if (!order) return { ok: false, added: 0, error: "Order not found" };

  const { data: items } = await supabase
    .from("order_items").select("variant_id,quantity").eq("order_id", orderId);

  let added = 0;
  for (const it of items ?? []) {
    if (!it.variant_id) continue;
    const res = await addToCart(it.variant_id, it.quantity);
    if (res.ok) added++;
  }
  return { ok: true, added };
}

export async function updateProfile(fullName: string, phone: string): Promise<{ ok: boolean; error?: string }> {
  const { hasSupabase } = await import("@/lib/env");
  if (!hasSupabase()) return { ok: false, error: "Demo mode — connect Supabase to save your profile." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in" };
  const { error } = await supabase.from("customers").update({ full_name: fullName || null, phone: phone || null }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
