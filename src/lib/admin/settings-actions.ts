"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePerm } from "@/lib/auth/guards";
import { hasSupabase } from "@/lib/env";
import { type ActionResult, DEMO_MESSAGE, dbErrorMessage, parseInput, settingsSchema } from "@/lib/validation/admin";

export async function updateSettings(raw: unknown): Promise<ActionResult> {
  const ctx = await requirePerm("settings:write");
  const parsed = parseInput(settingsSchema, raw, "Invalid settings");
  if (!parsed.ok) return parsed;
  if (!hasSupabase()) return { ok: false, error: DEMO_MESSAGE };
  const s = parsed.data;
  const db = createAdminClient();
  const { error } = await db.from("store_settings").update({
    store_name: s.store_name, currency: s.currency, flat_shipping_minor: s.flat_shipping_minor,
    free_shipping_threshold_minor: s.free_shipping_threshold_minor, tax_rate_bps: s.tax_rate_bps,
    support_email: s.support_email || null,
    support_phone: s.support_phone || null, whatsapp: s.whatsapp || null, address: s.address || null,
    instagram_url: s.instagram_url || null, facebook_url: s.facebook_url || null,
    express_surcharge_minor: s.express_surcharge_minor,
    express_enabled: s.express_enabled, pickup_enabled: s.pickup_enabled,
    standard_description: s.standard_description || null,
    express_description: s.express_description || null,
    pickup_description: s.pickup_description || null,
  }).eq("id", 1);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "settings.update", entity: "store_settings", entity_id: "1", after: {
    store_name: s.store_name, flat_shipping_minor: s.flat_shipping_minor,
    express_surcharge_minor: s.express_surcharge_minor, express_enabled: s.express_enabled, pickup_enabled: s.pickup_enabled,
  } });
  revalidatePath("/", "layout");
  return { ok: true };
}
