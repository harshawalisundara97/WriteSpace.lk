"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePerm } from "@/lib/auth/guards";

const promoSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  type: z.enum(["percentage", "fixed", "bxgy", "free_shipping"]),
  value: z.number().int().min(0),
  code: z.string().max(40).optional().or(z.literal("")),
  min_subtotal_minor: z.number().int().min(0).default(0),
  usage_limit: z.number().int().min(0).nullable().optional(),
  per_customer_limit: z.number().int().min(0).nullable().optional(),
  stackable: z.boolean().default(false),
  priority: z.number().int().default(0),
  is_active: z.boolean().default(true),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
});

export async function savePromotion(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requirePerm("promotions:write");
  const parsed = promoSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid promotion" };
  const p = parsed.data;
  const db = createAdminClient();
  const row = {
    name: p.name, type: p.type, value: p.value, code: p.code ? p.code.toUpperCase() : null,
    min_subtotal_minor: p.min_subtotal_minor, usage_limit: p.usage_limit ?? null,
    per_customer_limit: p.per_customer_limit ?? null, stackable: p.stackable, priority: p.priority,
    is_active: p.is_active, starts_at: p.starts_at || null, ends_at: p.ends_at || null,
  };
  const { error } = p.id
    ? await db.from("promotions").update(row).eq("id", p.id)
    : await db.from("promotions").insert(row);
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: p.id ? "promotion.update" : "promotion.create", entity: "promotions", entity_id: p.id ?? null, after: { name: p.name } });
  revalidatePath("/admin/promotions");
  revalidatePath("/promotions");
  return { ok: true };
}

export async function deletePromotion(id: string): Promise<{ ok: boolean }> {
  const ctx = await requirePerm("promotions:write");
  const db = createAdminClient();
  await db.from("promotions").delete().eq("id", id);
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "promotion.delete", entity: "promotions", entity_id: id });
  revalidatePath("/admin/promotions");
  return { ok: true };
}

const bannerSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(2).max(160),
  image_url: z.string().url().nullable().optional().or(z.literal("")),
  link_url: z.string().max(300).optional().or(z.literal("")),
  placement: z.enum(["home_hero", "promo_strip", "category"]),
  position: z.number().int().default(0),
  is_active: z.boolean().default(true),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
});

export async function saveBanner(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requirePerm("promotions:write");
  const parsed = bannerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid banner" };
  const b = parsed.data;
  const db = createAdminClient();
  const row = {
    title: b.title, image_url: b.image_url || null, link_url: b.link_url || null,
    placement: b.placement, position: b.position, is_active: b.is_active,
    starts_at: b.starts_at || null, ends_at: b.ends_at || null,
  };
  const { error } = b.id
    ? await db.from("banners").update(row).eq("id", b.id)
    : await db.from("banners").insert(row);
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: b.id ? "banner.update" : "banner.create", entity: "banners", entity_id: b.id ?? null, after: { title: b.title } });
  revalidatePath("/admin/promotions");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteBanner(id: string): Promise<{ ok: boolean }> {
  const ctx = await requirePerm("promotions:write");
  const db = createAdminClient();
  await db.from("banners").delete().eq("id", id);
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "banner.delete", entity: "banners", entity_id: id });
  revalidatePath("/admin/promotions");
  revalidatePath("/");
  return { ok: true };
}
