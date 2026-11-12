"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePerm } from "@/lib/auth/guards";

const schema = z.object({
  store_name: z.string().min(1).max(120),
  currency: z.string().length(3),
  flat_shipping_minor: z.number().int().min(0),
  free_shipping_threshold_minor: z.number().int().min(0).nullable(),
  tax_rate_bps: z.number().int().min(0).max(10000),
  support_email: z.string().email().nullable().or(z.literal("")),
});

export async function updateSettings(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requirePerm("settings:write");
  const full = schema.extend({
    support_phone: z.string().max(40).nullable().optional().or(z.literal("")),
    whatsapp: z.string().max(40).nullable().optional().or(z.literal("")),
    address: z.string().max(300).nullable().optional().or(z.literal("")),
    instagram_url: z.string().max(300).nullable().optional().or(z.literal("")),
    facebook_url: z.string().max(300).nullable().optional().or(z.literal("")),
  });
  const parsed = full.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  const s = parsed.data;
  const db = createAdminClient();
  const { error } = await db.from("store_settings").update({
    store_name: s.store_name, currency: s.currency, flat_shipping_minor: s.flat_shipping_minor,
    free_shipping_threshold_minor: s.free_shipping_threshold_minor, tax_rate_bps: s.tax_rate_bps,
    support_email: s.support_email || null,
    support_phone: s.support_phone || null, whatsapp: s.whatsapp || null, address: s.address || null,
    instagram_url: s.instagram_url || null, facebook_url: s.facebook_url || null,
  }).eq("id", 1);
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "settings.update", entity: "store_settings", entity_id: "1", after: { store_name: s.store_name } });
  revalidatePath("/", "layout");
  return { ok: true };
}
