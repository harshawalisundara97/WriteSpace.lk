import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import type { BundleWithItems, BundleItem, ProductVariant } from "@/lib/types";
import { demoBundles, demoBundleBySlug } from "@/lib/demo/data";

// Nested select: bundle + its items joined to the full product (+ variants +
// inventory) and the specific chosen variant.
const BUNDLE_SELECT =
  "id,name,slug,description,age_group,grade_label,image_url,bundle_price_minor,is_featured,position,status,created_at," +
  "bundle_items(quantity,position," +
  "product:products(id,category_id,name,slug,description,brand,age_group,status,images,seo_title,seo_description,specs,created_at," +
  "product_variants(id,product_id,sku,name,options,price_minor,compare_at_minor,currency,position,is_active," +
  "inventory(variant_id,on_hand,reserved,low_stock_threshold)))," +
  "variant:product_variants(id,product_id,sku,name,options,price_minor,compare_at_minor,currency,position,is_active))";

type RawBundleRow = Omit<BundleWithItems, "items"> & {
  bundle_items: { quantity: number; position: number; product: unknown; variant: unknown }[];
};

function shapeBundle(row: RawBundleRow): BundleWithItems {
  const items = (row.bundle_items ?? [])
    .filter((bi) => bi.product)
    .sort((a, b) => a.position - b.position)
    .map((bi): BundleItem => ({
      quantity: bi.quantity,
      product: bi.product as BundleItem["product"],
      variant: (bi.variant as ProductVariant | null) ?? null,
    }));
  const { bundle_items: _omit, ...bundle } = row;
  void _omit;
  return { ...bundle, items };
}

export async function getBundles(): Promise<BundleWithItems[]> {
  if (!hasSupabase()) return demoBundles();
  const supabase = await createClient();
  const { data } = await supabase
    .from("bundles").select(BUNDLE_SELECT).eq("status", "published").order("position");
  return ((data ?? []) as unknown as RawBundleRow[]).map(shapeBundle);
}

export async function getBundleBySlug(slug: string): Promise<BundleWithItems | null> {
  if (!hasSupabase()) return demoBundleBySlug(slug);
  const supabase = await createClient();
  const { data } = await supabase
    .from("bundles").select(BUNDLE_SELECT).eq("slug", slug).eq("status", "published").maybeSingle();
  return data ? shapeBundle(data as unknown as RawBundleRow) : null;
}

export async function getBundleSlugs(): Promise<string[]> {
  if (!hasSupabase()) return demoBundles().map((b) => b.slug);
  const supabase = await createClient();
  const { data } = await supabase.from("bundles").select("slug").eq("status", "published");
  return ((data ?? []) as { slug: string }[]).map((r) => r.slug);
}

// ---- pricing ----

/** The variant a bundle item resolves to (explicit, else the product's first). */
export function itemVariant(item: BundleItem): ProductVariant | null {
  return item.variant ?? item.product.product_variants?.[0] ?? null;
}

export interface BundlePricing {
  itemsTotalMinor: number;  // sum of item variant prices × qty (undiscounted)
  priceMinor: number;       // curated price, else itemsTotal
  savingsMinor: number;     // itemsTotal − price, never negative
  currency: string;
}

export function bundlePricing(bundle: BundleWithItems): BundlePricing {
  let itemsTotalMinor = 0;
  let currency = "LKR";
  for (const item of bundle.items) {
    const v = itemVariant(item);
    if (!v) continue;
    itemsTotalMinor += v.price_minor * item.quantity;
    currency = v.currency ?? currency;
  }
  const priceMinor = bundle.bundle_price_minor ?? itemsTotalMinor;
  return { itemsTotalMinor, priceMinor, savingsMinor: Math.max(0, itemsTotalMinor - priceMinor), currency };
}
