"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPerm } from "@/lib/auth/guards";
import { hasSupabase } from "@/lib/env";
import { DEMO_MESSAGE } from "@/lib/validation/admin";
import { bundleSchema, normalizeBundleItems } from "@/lib/validation/bundle";

type Result = { ok: boolean; id?: string; error?: string };



function revalidateBundles(slug?: string) {
  revalidatePath("/admin/bundles");
  revalidatePath("/bundles");
  if (slug) revalidatePath(`/bundles/${slug}`);
}

export async function saveBundle(raw: unknown): Promise<Result> {
  const perm = await checkPerm("products:write");
  if (!perm.ok) return perm;
  const ctx = perm.ctx;
  if (!hasSupabase()) return { ok: false, error: DEMO_MESSAGE };
  const parsed = bundleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid bundle" };
  const b = parsed.data;
  const db = createAdminClient();

  const bundleRow = {
    name: b.name,
    slug: b.slug,
    description: b.description || null,
    age_group: b.age_group,
    grade_label: b.grade_label || null,
    image_url: b.image_url || null,
    bundle_price_minor: b.bundle_price_minor ?? null,
    is_featured: b.is_featured,
    position: b.position,
    status: b.status,
  };

  let bundleId = b.id;
  if (bundleId) {
    const { error } = await db.from("bundles").update(bundleRow).eq("id", bundleId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await db.from("bundles").insert(bundleRow).select("id").single();
    if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" };
    bundleId = data.id;
  }

  // Replace the item set: drop existing rows, re-insert the normalized items.
  const items = normalizeBundleItems(b.items).map((it) => ({ bundle_id: bundleId, ...it }));
  const { error: delErr } = await db.from("bundle_items").delete().eq("bundle_id", bundleId);
  if (delErr) return { ok: false, error: delErr.message };
  if (items.length) {
    const { error: insErr } = await db.from("bundle_items").insert(items);
    if (insErr) return { ok: false, error: insErr.message };
  }

  await db.from("audit_logs").insert({
    actor: ctx.userId,
    action: b.id ? "bundle.update" : "bundle.create",
    entity: "bundles",
    entity_id: bundleId,
    after: { name: b.name, status: b.status, items: items.length },
  });

  revalidateBundles(b.slug);
  return { ok: true, id: bundleId };
}

export async function setBundleStatus(id: string, status: "draft" | "published"): Promise<Result> {
  const perm = await checkPerm("products:write");
  if (!perm.ok) return perm;
  const ctx = perm.ctx;
  if (!hasSupabase()) return { ok: false, error: DEMO_MESSAGE };
  const db = createAdminClient();
  const { error } = await db.from("bundles").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "bundle.status", entity: "bundles", entity_id: id, after: { status } });
  revalidateBundles();
  return { ok: true };
}

export async function deleteBundle(id: string): Promise<Result> {
  const perm = await checkPerm("products:write");
  if (!perm.ok) return perm;
  const ctx = perm.ctx;
  if (!hasSupabase()) return { ok: false, error: DEMO_MESSAGE };
  const db = createAdminClient();
  // bundle_items rows cascade on delete (FK on bundle_id).
  const { error } = await db.from("bundles").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "bundle.delete", entity: "bundles", entity_id: id });
  revalidateBundles();
  return { ok: true };
}
