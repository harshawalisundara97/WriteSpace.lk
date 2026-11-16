"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePerm } from "@/lib/auth/guards";
import { hasSupabase } from "@/lib/env";
import { type ActionResult, DEMO_MESSAGE, categorySchema, collectionSchema, dbErrorMessage, idSchema, parseInput } from "@/lib/validation/admin";

function revalidateCatalog() {
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
}

export async function saveCategory(raw: unknown): Promise<ActionResult> {
  const ctx = await requirePerm("products:write");
  const parsed = parseInput(categorySchema, raw, "Invalid category");
  if (!parsed.ok) return parsed;
  if (!hasSupabase()) return { ok: false, error: DEMO_MESSAGE };
  const c = parsed.data;
  const db = createAdminClient();
  const row = { name: c.name, slug: c.slug, description: c.description || null, parent_id: c.parent_id ?? null, age_group: c.age_group, position: c.position, is_featured: c.is_featured };
  const { error } = c.id ? await db.from("categories").update(row).eq("id", c.id) : await db.from("categories").insert(row);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: c.id ? "category.update" : "category.create", entity: "categories", entity_id: c.id ?? null, after: { name: c.name } });
  revalidateCatalog();
  return { ok: true };
}

export async function deleteCategory(id: unknown): Promise<ActionResult> {
  const ctx = await requirePerm("products:write");
  const parsed = parseInput(idSchema, id);
  if (!parsed.ok) return parsed;
  if (!hasSupabase()) return { ok: false, error: DEMO_MESSAGE };
  const db = createAdminClient();
  const { error } = await db.from("categories").delete().eq("id", parsed.data);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "category.delete", entity: "categories", entity_id: parsed.data });
  revalidateCatalog();
  return { ok: true };
}

export async function saveCollection(raw: unknown): Promise<ActionResult> {
  const ctx = await requirePerm("products:write");
  const parsed = parseInput(collectionSchema, raw, "Invalid collection");
  if (!parsed.ok) return parsed;
  if (!hasSupabase()) return { ok: false, error: DEMO_MESSAGE };
  const c = parsed.data;
  const db = createAdminClient();
  const row = { name: c.name, slug: c.slug, description: c.description || null, position: c.position, is_featured: c.is_featured };
  const { error } = c.id ? await db.from("collections").update(row).eq("id", c.id) : await db.from("collections").insert(row);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: c.id ? "collection.update" : "collection.create", entity: "collections", entity_id: c.id ?? null, after: { name: c.name } });
  revalidateCatalog();
  return { ok: true };
}

export async function deleteCollection(id: unknown): Promise<ActionResult> {
  const ctx = await requirePerm("products:write");
  const parsed = parseInput(idSchema, id);
  if (!parsed.ok) return parsed;
  if (!hasSupabase()) return { ok: false, error: DEMO_MESSAGE };
  const db = createAdminClient();
  const { error } = await db.from("collections").delete().eq("id", parsed.data);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "collection.delete", entity: "collections", entity_id: parsed.data });
  revalidateCatalog();
  return { ok: true };
}
