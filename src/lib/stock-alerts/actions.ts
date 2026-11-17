"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { canRequestAlert } from "@/lib/stock-alerts/rules";

const schema = z.object({
  variant_id: z.string().uuid("Unknown item"),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
});

export async function requestStockAlert(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };
  if (!hasSupabase()) return { ok: false, error: "Demo mode — connect Supabase to enable stock alerts" };
  const { variant_id, email } = parsed.data;
  const db = createAdminClient();

  const { data: inv } = await db.from("inventory").select("on_hand,reserved").eq("variant_id", variant_id).maybeSingle();
  const { data: variant } = await db.from("product_variants").select("id").eq("id", variant_id).eq("is_active", true).maybeSingle();
  if (!variant) return { ok: false, error: "Unknown item" };
  if (!canRequestAlert(inv)) return { ok: false, error: "Good news — this is in stock now" };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: row, error } = await db.from("stock_alerts")
    .insert({ variant_id, email, customer_id: auth.user?.id ?? null }).select("id").single();
  // Already waiting on this item — treat as success, don't reveal anything else.
  if (error?.code === "23505") return { ok: true };
  if (error || !row) return { ok: false, error: "Could not save your request. Please try again." };
  await db.from("audit_logs").insert({ actor: auth.user?.id ?? null, action: "stock_alert.create", entity: "stock_alerts", entity_id: row.id, after: { variant_id } });
  return { ok: true };
}
