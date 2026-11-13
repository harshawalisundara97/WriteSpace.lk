"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePerm } from "@/lib/auth/guards";
import { productSchema } from "@/lib/validation/product";

export async function saveProduct(raw: unknown): Promise<{ ok: boolean; id?: string; error?: string }> {
  const ctx = await requirePerm("products:write");
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid product" };
  const p = parsed.data;
  const db = createAdminClient();

  const productRow = {
    name: p.name, slug: p.slug, description: p.description || null, brand: p.brand || null,
    category_id: p.category_id ?? null, age_group: p.age_group, status: p.status,
    images: p.images, seo_title: p.seo_title || null, seo_description: p.seo_description || null, specs: p.specs,
  };

  let productId = p.id;
  if (productId) {
    const { error } = await db.from("products").update(productRow).eq("id", productId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await db.from("products").insert(productRow).select("id").single();
    if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" };
    productId = data.id;
  }

  // Upsert variants + inventory. Remove variants no longer present.
  const keepIds: string[] = [];
  for (const v of p.variants) {
    const variantRow = {
      product_id: productId, sku: v.sku, name: v.name || null,
      price_minor: v.price_minor, compare_at_minor: v.compare_at_minor ?? null, is_active: v.is_active,
    };
    let variantId = v.id;
    if (variantId) {
      await db.from("product_variants").update(variantRow).eq("id", variantId);
    } else {
      const { data } = await db.from("product_variants").insert(variantRow).select("id").single();
      variantId = data?.id;
    }
    if (!variantId) continue;
    keepIds.push(variantId);
    await db.from("inventory").upsert(
      { variant_id: variantId, on_hand: v.on_hand, low_stock_threshold: v.low_stock_threshold },
      { onConflict: "variant_id" },
    );
  }
  // Delete removed variants (and their inventory via cascade).
  if (keepIds.length) {
    await db.from("product_variants").delete().eq("product_id", productId).not("id", "in", `(${keepIds.join(",")})`);
  }

  await db.from("audit_logs").insert({
    actor: ctx.userId, action: p.id ? "product.update" : "product.create",
    entity: "products", entity_id: productId, after: { name: p.name, status: p.status },
  });

  revalidatePath("/admin/products");
  revalidatePath("/products");
  if (p.status === "published") revalidatePath(`/products/${p.slug}`);
  return { ok: true, id: productId };
}

export async function setProductStatus(id: string, status: "draft" | "published"): Promise<{ ok: boolean }> {
  const ctx = await requirePerm("products:write");
  const db = createAdminClient();
  await db.from("products").update({ status }).eq("id", id);
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "product.status", entity: "products", entity_id: id, after: { status } });
  revalidatePath("/admin/products");
  revalidatePath("/products");
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<{ ok: boolean }> {
  const ctx = await requirePerm("products:write");
  const db = createAdminClient();
  await db.from("products").delete().eq("id", id);
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "product.delete", entity: "products", entity_id: id });
  revalidatePath("/admin/products");
  revalidatePath("/products");
  return { ok: true };
}

// Upload an image to the public product-images bucket; returns its public URL.
export async function uploadProductImage(formData: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  await requirePerm("products:write");
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file" };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "Max 5MB" };
  const db = createAdminClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false, error: error.message };
  const { data } = db.storage.from("product-images").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

export async function bulkProductAction(ids: string[], action: "publish" | "draft" | "delete"): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requirePerm("products:write");
  if (ids.length === 0) return { ok: false, error: "Nothing selected" };
  const db = createAdminClient();
  if (action === "delete") {
    const { error } = await db.from("products").delete().in("id", ids);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await db.from("products").update({ status: action === "publish" ? "published" : "draft" }).in("id", ids);
    if (error) return { ok: false, error: error.message };
  }
  await db.from("audit_logs").insert({ actor: ctx.userId, action: `product.bulk_${action}`, entity: "products", after: { count: ids.length } });
  revalidatePath("/admin/products");
  revalidatePath("/products");
  return { ok: true };
}
