"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePerm } from "@/lib/auth/guards";

const slug = z.string().min(2).max(120).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only");

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  slug,
  description: z.string().max(500).optional().or(z.literal("")),
  parent_id: z.string().uuid().nullable().optional(),
  age_group: z.enum(["kids", "adults", "all"]),
  position: z.number().int().default(0),
  is_featured: z.boolean().default(false),
});

export async function saveCategory(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requirePerm("products:write");
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid category" };
  const c = parsed.data;
  const db = createAdminClient();
  const row = { name: c.name, slug: c.slug, description: c.description || null, parent_id: c.parent_id ?? null, age_group: c.age_group, position: c.position, is_featured: c.is_featured };
  const { error } = c.id ? await db.from("categories").update(row).eq("id", c.id) : await db.from("categories").insert(row);
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: c.id ? "category.update" : "category.create", entity: "categories", entity_id: c.id ?? null, after: { name: c.name } });
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requirePerm("products:write");
  const db = createAdminClient();
  const { error } = await db.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "category.delete", entity: "categories", entity_id: id });
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return { ok: true };
}

const collectionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  slug,
  description: z.string().max(500).optional().or(z.literal("")),
  position: z.number().int().default(0),
  is_featured: z.boolean().default(false),
});

export async function saveCollection(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requirePerm("products:write");
  const parsed = collectionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid collection" };
  const c = parsed.data;
  const db = createAdminClient();
  const row = { name: c.name, slug: c.slug, description: c.description || null, position: c.position, is_featured: c.is_featured };
  const { error } = c.id ? await db.from("collections").update(row).eq("id", c.id) : await db.from("collections").insert(row);
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: c.id ? "collection.update" : "collection.create", entity: "collections", entity_id: c.id ?? null, after: { name: c.name } });
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCollection(id: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requirePerm("products:write");
  const db = createAdminClient();
  const { error } = await db.from("collections").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "collection.delete", entity: "collections", entity_id: id });
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return { ok: true };
}
