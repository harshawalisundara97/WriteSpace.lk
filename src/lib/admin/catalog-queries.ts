import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Category, ProductWithVariants } from "@/lib/types";

const SELECT =
  "id,category_id,name,slug,description,brand,age_group,status,images,seo_title,seo_description,created_at," +
  "product_variants(id,product_id,sku,name,options,price_minor,compare_at_minor,currency,position,is_active," +
  "inventory(variant_id,on_hand,reserved,low_stock_threshold))";

export async function getAdminProducts(): Promise<ProductWithVariants[]> {
  const db = createAdminClient();
  const { data } = await db.from("products").select(SELECT).order("created_at", { ascending: false }).limit(200);
  return (data ?? []) as unknown as ProductWithVariants[];
}

export async function getAdminProduct(id: string): Promise<ProductWithVariants | null> {
  const db = createAdminClient();
  const { data } = await db.from("products").select(SELECT).eq("id", id).maybeSingle();
  return (data as unknown as ProductWithVariants | null) ?? null;
}

export async function getAdminCategories(): Promise<Category[]> {
  const db = createAdminClient();
  const { data } = await db.from("categories").select("*").order("position");
  return (data ?? []) as Category[];
}
