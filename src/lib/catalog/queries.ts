import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Banner, Category, Collection, Product, ProductWithVariants, Promotion,
} from "@/lib/types";
import { hasSupabase } from "@/lib/env";
import { variantColorName, COLOR_HEX } from "@/lib/catalog/variant-color";
import {
  demoCategories, demoCollections, demoProducts, demoBanners, demoPromotions,
  demoSettings, demoCollectionProducts,
} from "@/lib/demo/data";
import { SPEC_FIELDS, specFilterLabel, type SpecKey, type ProductSpecs } from "@/lib/catalog/specs";

const PRODUCT_SELECT =
  "id,category_id,name,slug,description,brand,age_group,status,images,seo_title,seo_description,specs,price_tiers,created_at," +
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
  colours?: string[];
  specs?: Partial<Record<SpecKey, string[]>>;  // spec key → selected raw values
  sort?: "newest" | "price_asc" | "price_desc" | "name";
  page?: number;
  pageSize?: number;
}

export async function getStoreSettings() {
  if (!hasSupabase()) return demoSettings;
  const supabase = await createClient();
  const { data } = await supabase.from("store_settings").select("*").eq("id", 1).single();
  return {
    flat_shipping_minor: data?.flat_shipping_minor ?? 35000,
    free_shipping_threshold_minor: data?.free_shipping_threshold_minor ?? null,
    tax_rate_bps: data?.tax_rate_bps ?? 0,
    currency: data?.currency ?? "LKR",
    store_name: data?.store_name ?? "WriteSpace.lk",
    support_email: data?.support_email ?? null,
    support_phone: data?.support_phone ?? null,
    whatsapp: data?.whatsapp ?? null,
    address: data?.address ?? null,
    instagram_url: data?.instagram_url ?? null,
    facebook_url: data?.facebook_url ?? null,
  };
}

export async function getFeaturedCategories(): Promise<Category[]> {
  if (!hasSupabase()) return demoCategories;
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories").select("*").eq("is_featured", true).order("position");
  return data ?? [];
}

export async function getAllCategories(): Promise<Category[]> {
  if (!hasSupabase()) return demoCategories;
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("position");
  return data ?? [];
}

export type SitemapEntry = { slug: string; lastModified?: string };

export async function getSitemapEntries(): Promise<{ products: SitemapEntry[]; categories: SitemapEntry[]; collections: SitemapEntry[] }> {
  if (!hasSupabase()) {
    return {
      products: demoProducts.map((p) => ({ slug: p.slug, lastModified: p.created_at })),
      categories: demoCategories.map((c) => ({ slug: c.slug })),
      collections: demoCollections.map((c) => ({ slug: c.slug })),
    };
  }
  const supabase = await createClient();
  const [{ data: products }, { data: categories }, { data: collections }] = await Promise.all([
    supabase.from("products").select("slug,created_at").eq("status", "published"),
    supabase.from("categories").select("slug"),
    supabase.from("collections").select("slug"),
  ]);
  return {
    products: (products ?? []).map((p: { slug: string; created_at: string | null }) => ({ slug: p.slug, lastModified: p.created_at ?? undefined })),
    categories: (categories ?? []).map((c: { slug: string }) => ({ slug: c.slug })),
    collections: (collections ?? []).map((c: { slug: string }) => ({ slug: c.slug })),
  };
}

export async function getActiveBanners(placement?: string): Promise<Banner[]> {
  if (!hasSupabase()) return placement ? demoBanners.filter((b) => b.placement === placement) : demoBanners;
  const supabase = await createClient();
  let q = supabase.from("banners").select("*").order("position");
  if (placement) q = q.eq("placement", placement);
  const { data } = await q;
  return data ?? [];
}

export async function getActivePromotions(): Promise<Promotion[]> {
  if (!hasSupabase()) return demoPromotions;
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("promotions").select("*").eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`);
  return (data ?? []) as Promotion[];
}

export async function getCollectionProducts(slug: string, limit = 8): Promise<ProductWithVariants[]> {
  if (!hasSupabase()) return demoCollectionProducts(slug).slice(0, limit);
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
  if (!hasSupabase()) return demoCollections;
  const supabase = await createClient();
  const { data } = await supabase
    .from("collections").select("*").eq("is_featured", true).order("position");
  return data ?? [];
}

export async function getProductBySlug(slug: string): Promise<ProductWithVariants | null> {
  if (!hasSupabase()) return demoProducts.find((p) => p.slug === slug) ?? null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products").select(PRODUCT_SELECT).eq("slug", slug).eq("status", "published").maybeSingle();
  return (data as unknown as ProductWithVariants | null) ?? null;
}

export async function getRelatedProducts(categoryId: string | null, excludeId: string, limit = 4): Promise<ProductWithVariants[]> {
  if (!hasSupabase()) return demoProducts.filter((p) => p.category_id === categoryId && p.id !== excludeId).slice(0, limit);
  if (!categoryId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("products").select(PRODUCT_SELECT)
    .eq("status", "published").eq("category_id", categoryId).neq("id", excludeId).limit(limit);
  return (data ?? []) as unknown as ProductWithVariants[];
}

function matchSpecs(specs: ProductSpecs | null | undefined, sel: Partial<Record<SpecKey, string[]>> | undefined): boolean {
  if (!sel) return true;
  for (const key of Object.keys(sel) as SpecKey[]) {
    const vals = sel[key];
    if (!vals?.length) continue;
    const raw = specs?.[key];
    if (raw == null || !vals.includes(String(raw))) return false;
  }
  return true;
}

export async function getProducts(filters: CatalogFilters): Promise<{ products: ProductWithVariants[]; total: number }> {
  if (!hasSupabase()) {
    let list = demoProducts.slice();
    if (filters.category) { const cat = demoCategories.find((c) => c.slug === filters.category); list = list.filter((p) => p.category_id === cat?.id); }
    if (filters.ageGroup) list = list.filter((p) => p.age_group === filters.ageGroup || p.age_group === "all");
    if (filters.brands?.length) list = list.filter((p) => !!p.brand && filters.brands!.includes(p.brand));
    if (filters.q?.trim()) { const t = filters.q.trim().toLowerCase(); list = list.filter((p) => p.name.toLowerCase().includes(t)); }
    if (filters.colours?.length) list = list.filter((p) => p.product_variants.some((v) => { const c = variantColorName(v.name, v.options); return c && filters.colours!.includes(c); }));
    if (filters.specs) list = list.filter((p) => matchSpecs(p.specs, filters.specs));
    list = list.filter((p) => {
      const min = Math.min(...p.product_variants.map((v) => v.price_minor));
      if (filters.minMinor != null && min < filters.minMinor) return false;
      if (filters.maxMinor != null && min > filters.maxMinor) return false;
      if (filters.inStock && !p.product_variants.some((v) => (v.inventory?.on_hand ?? 0) > 0)) return false;
      return true;
    });
    if (filters.sort === "price_asc" || filters.sort === "price_desc") list.sort((a, b) => { const pa = Math.min(...a.product_variants.map((v) => v.price_minor)); const pb = Math.min(...b.product_variants.map((v) => v.price_minor)); return filters.sort === "price_asc" ? pa - pb : pb - pa; });
    else if (filters.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return { products: list, total: list.length };
  }
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
    if (filters.colours?.length) {
      const match = p.product_variants.some((v) => { const c = variantColorName(v.name, v.options); return c && filters.colours!.includes(c); });
      if (!match) return false;
    }
    if (!matchSpecs(p.specs, filters.specs)) return false;
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
  if (!hasSupabase()) return Array.from(new Set(demoProducts.map((p) => p.brand).filter(Boolean) as string[])).sort();
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("brand").eq("status", "published").not("brand", "is", null);
  return Array.from(new Set((data ?? []).map((r: { brand: string | null }) => r.brand).filter(Boolean) as string[])).sort();
}

export async function searchProducts(term: string, limit = 10): Promise<Product[]> {
  if (!hasSupabase()) {
    const t = term.trim().toLowerCase();
    if (!t) return [];
    return demoProducts.filter((p) => p.name.toLowerCase().includes(t) || (p.brand ?? "").toLowerCase().includes(t)).slice(0, limit) as unknown as Product[];
  }
  const supabase = await createClient();
  const cleaned = term.trim();
  if (!cleaned) return [];
  // websearch_to_tsquery handles multi-word + partial gracefully; trigram backs typos via ilike fallback.
  const { data } = await supabase
    .from("products")
    .select("id,category_id,name,slug,description,brand,age_group,status,images,seo_title,seo_description,specs,price_tiers,created_at")
    .eq("status", "published")
    .textSearch("search_vector", cleaned, { type: "websearch", config: "simple" })
    .limit(limit);
  if (data && data.length) return data as Product[];
  // typo-tolerant fallback
  const { data: fuzzy } = await supabase
    .from("products")
    .select("id,category_id,name,slug,description,brand,age_group,status,images,seo_title,seo_description,specs,price_tiers,created_at")
    .eq("status", "published")
    .ilike("name", `%${cleaned}%`)
    .limit(limit);
  return (fuzzy ?? []) as Product[];
}

export interface SpecFacet {
  key: SpecKey;
  label: string;
  values: { value: string; label: string; count: number }[];
}
export interface Facets {
  brands: { name: string; count: number }[];
  colours: { name: string; hex: string; count: number }[];
  priceMin: number;   // minor
  priceMax: number;   // minor
  inStock: number;
  total: number;
  specs: SpecFacet[];
}

function computeFacets(products: ProductWithVariants[]): Facets {
  const brandMap = new Map<string, number>();
  const colourMap = new Map<string, number>();
  let priceMin = Infinity, priceMax = 0, inStock = 0;
  const specMaps = new Map<SpecKey, Map<string, number>>();

  for (const p of products) {
    if (p.brand) brandMap.set(p.brand, (brandMap.get(p.brand) ?? 0) + 1);
    const colours = new Set<string>();
    let hasStock = false;
    let pMin = Infinity;
    for (const v of p.product_variants) {
      pMin = Math.min(pMin, v.price_minor);
      const c = variantColorName(v.name, v.options);
      if (c) colours.add(c);
      if ((v.inventory?.on_hand ?? 0) - (v.inventory?.reserved ?? 0) > 0) hasStock = true;
    }
    if (pMin !== Infinity) { priceMin = Math.min(priceMin, pMin); priceMax = Math.max(priceMax, pMin); }
    if (hasStock) inStock++;
    for (const c of colours) colourMap.set(c, (colourMap.get(c) ?? 0) + 1);
    for (const field of SPEC_FIELDS) {
      const raw = p.specs?.[field.key];
      if (raw == null || raw === "") continue;
      const val = String(raw);
      let m = specMaps.get(field.key);
      if (!m) { m = new Map(); specMaps.set(field.key, m); }
      m.set(val, (m.get(val) ?? 0) + 1);
    }
  }

  const specFacets: SpecFacet[] = [];
  for (const field of SPEC_FIELDS) {
    const m = specMaps.get(field.key);
    if (!m || m.size === 0) continue;
    const values = Array.from(m.entries()).map(([value, count]) => ({ value, label: specFilterLabel(field.key, value), count }));
    if (field.kind === "number") values.sort((a, b) => Number(a.value) - Number(b.value));
    else if (field.options) { const opts = field.options; values.sort((a, b) => opts.indexOf(a.value) - opts.indexOf(b.value)); }
    else values.sort((a, b) => a.value.localeCompare(b.value));
    specFacets.push({ key: field.key, label: field.label, values });
  }

  return {
    brands: Array.from(brandMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
    colours: Array.from(colourMap.entries()).map(([name, count]) => ({ name, hex: COLOR_HEX[name], count })),
    priceMin: priceMin === Infinity ? 0 : priceMin,
    priceMax,
    inStock,
    total: products.length,
    specs: specFacets,
  };
}

// Facet counts for the current browse context (category + age only), so counts
// reflect what's available without collapsing to zero as the user narrows.
export async function getFacets(filters: Pick<CatalogFilters, "category" | "ageGroup">): Promise<Facets> {
  if (!hasSupabase()) {
    let list = demoProducts.slice();
    if (filters.category) { const cat = demoCategories.find((c) => c.slug === filters.category); list = list.filter((p) => p.category_id === cat?.id); }
    if (filters.ageGroup) list = list.filter((p) => p.age_group === filters.ageGroup || p.age_group === "all");
    return computeFacets(list);
  }
  const supabase = await createClient();
  let q = supabase.from("products").select(PRODUCT_SELECT).eq("status", "published");
  if (filters.category) {
    const { data: cat } = await supabase.from("categories").select("id").eq("slug", filters.category).single();
    if (cat) q = q.eq("category_id", cat.id);
  }
  if (filters.ageGroup) q = q.in("age_group", [filters.ageGroup, "all"]);
  const { data } = await q;
  return computeFacets((data ?? []) as unknown as ProductWithVariants[]);
}
