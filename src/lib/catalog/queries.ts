import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Banner, Category, Collection, Product, ProductWithVariants, Promotion,
} from "@/lib/types";

const PRODUCT_SELECT =
  "id,category_id,name,slug,description,brand,age_group,status,images,seo_title,seo_description,created_at," +
  "product_variants(id,product_id,sku,name,options,price_minor,compare_at_minor,currency,position,is_active," +
  "inventory(variant_id,on_hand,reserved,low_stock_threshold))";

export interface CatalogFilters {
  category?: string;      // slug
  collection?: string;    // slug
  q?: string;             // free-text
  ageGroup?: "kids" | "adults";
  brands?: string[];
  minMinor?: number;
  maxMinor?: number;
  inStock?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "name";
  page?: number;
  pageSize?: number;
}

export async function getStoreSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("store_settings").select("*").eq("id", 1).single();
  return {
    flat_shipping_minor: data?.flat_shipping_minor ?? 35000,
    free_shipping_threshold_minor: data?.free_shipping_threshold_minor ?? null,
    tax_rate_bps: data?.tax_rate_bps ?? 0,
    currency: data?.currency ?? "LKR",
    store_name: data?.store_name ?? "WriteSpace.lk",
  };
}

export async function getFeaturedCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories").select("*").eq("is_featured", true).order("position");
  return data ?? [];
}

export async function getAllCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("position");
  return data ?? [];
}

export async function getActiveBanners(placement?: string): Promise<Banner[]> {
  const supabase = await createClient();
  let q = supabase.from("banners").select("*").order("position");
  if (placement) q = q.eq("placement", placement);
  const { data } = await q;
  return data ?? [];
}

export async function getActivePromotions(): Promise<Promotion[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("promotions").select("*").eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`);
  return (data ?? []) as Promotion[];
}

export async function getCollectionProducts(slug: string, limit = 8): Promise<ProductWithVariants[]> {
  const supabase = await createClient();
  const { data: col } = await supabase.from("collections").select("id").eq("slug", slug).single();
  if (!col) return [];
  const { data } = await supabase
    .from("product_collections")
    .select(`product:products(${PRODUCT_SELECT})`)
    .eq("collection_id", col.id)
    .limit(limit);
  return (data ?? []).map((r: { product: unknown }) => r.product).filter(Boolean) as unknown as ProductWithVariants[];
}

export async function getFeaturedCollections(): Promise<Collection[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("collections").select("*").eq("is_featured", true).order("position");
  return data ?? [];
}

export async function getProductBySlug(slug: string): Promise<ProductWithVariants | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products").select(PRODUCT_SELECT).eq("slug", slug).eq("status", "published").maybeSingle();
  return (data as unknown as ProductWithVariants | null) ?? null;
}

export async function getRelatedProducts(categoryId: string | null, excludeId: string, limit = 4): Promise<ProductWithVariants[]> {
  if (!categoryId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("products").select(PRODUCT_SELECT)
    .eq("status", "published").eq("category_id", categoryId).neq("id", excludeId).limit(limit);
  return (data ?? []) as unknown as ProductWithVariants[];
}

export async function getProducts(filters: CatalogFilters): Promise<{ products: ProductWithVariants[]; total: number }> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 12;

  let q = supabase.from("products").select(PRODUCT_SELECT, { count: "exact" }).eq("status", "published");

  if (filters.category) {
    const { data: cat } = await supabase.from("categories").select("id").eq("slug", filters.category).single();
    if (cat) q = q.eq("category_id", cat.id);
  }
  if (filters.ageGroup) q = q.in("age_group", [filters.ageGroup, "all"]);
  if (filters.brands?.length) q = q.in("brand", filters.brands);
  if (filters.q?.trim()) q = q.ilike("name", `%${filters.q.trim()}%`);

  switch (filters.sort) {
    case "name": q = q.order("name"); break;
    case "price_asc":
    case "price_desc":
      q = q.order("created_at", { ascending: false }); break; // price sort refined below
    default: q = q.order("created_at", { ascending: false });
  }

  q = q.range((page - 1) * pageSize, page * pageSize - 1);
  const { data, count } = await q;
  let products = (data ?? []) as unknown as ProductWithVariants[];

  // Client-side refine for variant-derived facets (price range, in-stock, price sort).
  products = products.filter((p) => {
    const prices = p.product_variants.map((v) => v.price_minor);
    const min = Math.min(...prices);
    if (filters.minMinor != null && min < filters.minMinor) return false;
    if (filters.maxMinor != null && min > filters.maxMinor) return false;
    if (filters.inStock) {
      const anyStock = p.product_variants.some((v) => (v.inventory?.on_hand ?? 0) - (v.inventory?.reserved ?? 0) > 0);
      if (!anyStock) return false;
    }
    return true;
  });

  if (filters.sort === "price_asc" || filters.sort === "price_desc") {
    products.sort((a, b) => {
      const pa = Math.min(...a.product_variants.map((v) => v.price_minor));
      const pb = Math.min(...b.product_variants.map((v) => v.price_minor));
      return filters.sort === "price_asc" ? pa - pb : pb - pa;
    });
  }

  return { products, total: count ?? products.length };
}

export async function getBrands(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("brand").eq("status", "published").not("brand", "is", null);
  return Array.from(new Set((data ?? []).map((r: { brand: string | null }) => r.brand).filter(Boolean) as string[])).sort();
}

export async function searchProducts(term: string, limit = 10): Promise<Product[]> {
  const supabase = await createClient();
  const cleaned = term.trim();
  if (!cleaned) return [];
  // websearch_to_tsquery handles multi-word + partial gracefully; trigram backs typos via ilike fallback.
  const { data } = await supabase
    .from("products")
    .select("id,category_id,name,slug,description,brand,age_group,status,images,seo_title,seo_description,created_at")
    .eq("status", "published")
    .textSearch("search_vector", cleaned, { type: "websearch", config: "simple" })
    .limit(limit);
  if (data && data.length) return data as Product[];
  // typo-tolerant fallback
  const { data: fuzzy } = await supabase
    .from("products")
    .select("id,category_id,name,slug,description,brand,age_group,status,images,seo_title,seo_description,created_at")
    .eq("status", "published")
    .ilike("name", `%${cleaned}%`)
    .limit(limit);
  return (fuzzy ?? []) as Product[];
}
