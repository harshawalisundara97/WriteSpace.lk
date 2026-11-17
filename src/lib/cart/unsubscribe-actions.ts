"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/env";
import { unsubscribeSecret, verifyUnsubscribeToken } from "@/lib/cart/abandoned";

export async function unsubscribeCartReminders(customerId: string, token: string): Promise<{ ok: boolean; error?: string }> {
  if (!verifyUnsubscribeToken(customerId, token, unsubscribeSecret())) return { ok: false, error: "This unsubscribe link is invalid or has expired." };
  if (!hasSupabase()) return { ok: false, error: "Demo mode — connect Supabase to save changes." };
  const db = createAdminClient();
  const { error } = await db.from("customers").update({ cart_reminders_opt_out: true }).eq("id", customerId);
  if (error) return { ok: false, error: "Could not update your preferences. Please try again." };
  await db.from("audit_logs").insert({ actor: customerId, action: "customer.cart_reminders_opt_out", entity: "customers", entity_id: customerId, after: { cart_reminders_opt_out: true } });
  return { ok: true };
}
