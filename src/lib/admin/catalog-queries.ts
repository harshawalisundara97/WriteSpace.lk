import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Category, ProductWithVariants } from "@/lib/types";
import { hasSupabase } from "@/lib/env";
import { demoProducts, demoCategories } from "@/lib/demo/data";

const SELECT =
  "id,category_id,name,slug,description,brand,age_group,status,images,seo_title,seo_description,specs,price_tiers,created_at," +
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

export async function getAdminCollections() {
  const { hasSupabase } = await import("@/lib/env");
  if (!hasSupabase()) {
    const { demoCollections } = await import("@/lib/demo/data");
    return demoCollections;
  }
  const db = createAdminClient();
  const { data } = await db.from("collections").select("*").order("position");
  return data ?? [];
}

export type AdminBanner = {
  id: string;
  title: string;
  image_url: string | null;
  link_url: string | null;
  placement: string;
  position: number;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
};

export async function getAdminBanners(): Promise<AdminBanner[]> {
  if (!hasSupabase()) {
    const { demoBanners } = await import("@/lib/demo/data");
    return demoBanners.map((b) => ({ ...b, is_active: true }));
  }
  const db = createAdminClient();
  const { data } = await db.from("banners").select("*").order("placement").order("position");
  return (data ?? []) as AdminBanner[];
}

export type AdminReview = {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  author: string;
  created_at: string;
  is_approved: boolean;
};

export async function getAdminReviews(): Promise<AdminReview[]> {
  if (!hasSupabase()) {
    const { demoProductReviews } = await import("@/lib/demo/data");
    const out: AdminReview[] = [];
    for (const p of demoProducts) {
      for (const r of demoProductReviews(p.id)) {
        out.push({
          id: r.id,
          product_id: p.id,
          product_name: p.name,
          product_slug: p.slug ?? null,
          rating: r.rating,
          title: r.title,
          body: r.body,
          author: r.author,
          created_at: r.created_at,
          // Demo: treat unverified demo reviews as "pending" so moderation is viewable.
          is_approved: r.verified,
        });
      }
    }
    return out.sort((a, b) => (a.is_approved === b.is_approved ? b.created_at.localeCompare(a.created_at) : a.is_approved ? 1 : -1));
  }
  const db = createAdminClient();
  const { data } = await db
    .from("reviews")
    .select("id,product_id,rating,title,body,is_approved,created_at,product:products(name,slug),customer:customers(full_name)")
    .order("is_approved", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(300);
  type Row = {
    id: string; product_id: string; rating: number; title: string | null; body: string | null;
    is_approved: boolean; created_at: string;
    product: { name: string | null; slug: string | null } | null;
    customer: { full_name: string | null } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    product_id: r.product_id,
    product_name: r.product?.name ?? "Unknown product",
    product_slug: r.product?.slug ?? null,
    rating: r.rating,
    title: r.title,
    body: r.body,
    author: r.customer?.full_name ?? "Customer",
    created_at: r.created_at,
    is_approved: r.is_approved,
  }));
}
