"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPerm } from "@/lib/auth/guards";
import { hasSupabase } from "@/lib/env";
import { type ActionResult, DEMO_MESSAGE, bannerSchema, dbErrorMessage, idSchema, parseInput, promoSchema } from "@/lib/validation/admin";

export async function savePromotion(raw: unknown): Promise<ActionResult> {
  const perm = await checkPerm("promotions:write");
  if (!perm.ok) return perm;
  const ctx = perm.ctx;
  const parsed = parseInput(promoSchema, raw, "Invalid promotion");
  if (!parsed.ok) return parsed;
  if (!hasSupabase()) return { ok: false, error: DEMO_MESSAGE };
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
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: p.id ? "promotion.update" : "promotion.create", entity: "promotions", entity_id: p.id ?? null, after: { name: p.name } });
  revalidatePath("/admin/promotions");
  revalidatePath("/promotions");
  return { ok: true };
}

export async function deletePromotion(id: unknown): Promise<ActionResult> {
  const perm = await checkPerm("promotions:write");
  if (!perm.ok) return perm;
  const ctx = perm.ctx;
  const parsed = parseInput(idSchema, id);
  if (!parsed.ok) return parsed;
  if (!hasSupabase()) return { ok: false, error: DEMO_MESSAGE };
  const db = createAdminClient();
  const { error } = await db.from("promotions").delete().eq("id", parsed.data);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "promotion.delete", entity: "promotions", entity_id: parsed.data });
  revalidatePath("/admin/promotions");
  revalidatePath("/promotions");
  return { ok: true };
}

export async function saveBanner(raw: unknown): Promise<ActionResult> {
  const perm = await checkPerm("promotions:write");
  if (!perm.ok) return perm;
  const ctx = perm.ctx;
  const parsed = parseInput(bannerSchema, raw, "Invalid banner");
  if (!parsed.ok) return parsed;
  if (!hasSupabase()) return { ok: false, error: DEMO_MESSAGE };
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
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: b.id ? "banner.update" : "banner.create", entity: "banners", entity_id: b.id ?? null, after: { title: b.title } });
  revalidatePath("/admin/promotions");
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteBanner(id: unknown): Promise<ActionResult> {
  const perm = await checkPerm("promotions:write");
  if (!perm.ok) return perm;
  const ctx = perm.ctx;
  const parsed = parseInput(idSchema, id);
  if (!parsed.ok) return parsed;
  if (!hasSupabase()) return { ok: false, error: DEMO_MESSAGE };
  const db = createAdminClient();
  const { error } = await db.from("banners").delete().eq("id", parsed.data);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "banner.delete", entity: "banners", entity_id: parsed.data });
  revalidatePath("/admin/promotions");
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { ok: true };
}
