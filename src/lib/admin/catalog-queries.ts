import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Category, ProductWithVariants } from "@/lib/types";
import { hasSupabase } from "@/lib/env";
import { demoProducts, demoCategories } from "@/lib/demo/data";

const SELECT =
  "id,category_id,name,slug,description,brand,age_group,status,images,seo_title,seo_description,created_at," +
  "product_variants(id,product_id,sku,name,options,price_minor,compare_at_minor,currency,position,is_active," +
  "inventory(variant_id,on_hand,reserved,low_stock_threshold))";

export async function getAdminProducts(): Promise<ProductWithVariants[]> {
  if (!hasSupabase()) return demoProducts;
  const db = createAdminClient();
  const { data } = await db.from("products").select(SELECT).order("created_at", { ascending: false }).limit(200);
  return (data ?? []) as unknown as ProductWithVariants[];
}

export async function getAdminProduct(id: string): Promise<ProductWithVariants | null> {
  if (!hasSupabase()) return demoProducts.find((p) => p.id === id) ?? null;
  const db = createAdminClient();
  const { data } = await db.from("products").select(SELECT).eq("id", id).maybeSingle();
  return (data as unknown as ProductWithVariants | null) ?? null;
}

export async function getAdminCategories(): Promise<Category[]> {
  if (!hasSupabase()) return demoCategories;
  const db = createAdminClient();
  const { data } = await db.from("categories").select("*").order("position");
  return (data ?? []) as Category[];
}
