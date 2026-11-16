import { z } from "zod";

// Bundle / school pack admin input (TASK-ADMIN-001). A bundle is a curated set
// of existing products (each with a quantity + optional specific variant) sold
// together, with an optional curated price. Mirrors the `bundles` /
// `bundle_items` schema (supabase/migrations/0008_bundles.sql).

const slug = z
  .string()
  .min(2)
  .max(140)
  .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only");

export const bundleItemSchema = z.object({
  product_id: z.string().uuid("Pick a product"),
  variant_id: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(999),
  position: z.number().int().default(0),
});

export const bundleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "Enter a name").max(140),
  slug,
  description: z.string().max(2000).optional().or(z.literal("")),
  age_group: z.enum(["kids", "adults", "all"]).default("all"),
  grade_label: z.string().max(60).optional().or(z.literal("")),
  image_url: z.string().url("Enter a valid URL").max(500).optional().or(z.literal("")),
  // null (or omitted) = sum of item prices, i.e. no curated discount.
  bundle_price_minor: z.number().int().min(0).nullable().optional(),
  is_featured: z.boolean().default(false),
  position: z.number().int().default(0),
  status: z.enum(["draft", "published"]).default("published"),
  items: z.array(bundleItemSchema).min(1, "Add at least one product"),
});

export type BundleInput = z.input<typeof bundleSchema>;
export type BundleItemInput = z.infer<typeof bundleItemSchema>;

export interface NormalizedBundleItem {
  product_id: string;
  variant_id: string | null;
  quantity: number;
  position: number;
}

// The `bundle_items` primary key is (bundle_id, product_id), so a product may
// appear at most once per bundle. Drop duplicate products (keeping the first),
// coerce the variant to null when absent, and assign sequential positions in
// the given order.
export function normalizeBundleItems(items: BundleItemInput[]): NormalizedBundleItem[] {
  const seen = new Set<string>();
  const out: NormalizedBundleItem[] = [];
  for (const it of items) {
    if (seen.has(it.product_id)) continue;
    seen.add(it.product_id);
    out.push({
      product_id: it.product_id,
      variant_id: it.variant_id ?? null,
      quantity: it.quantity,
      position: out.length,
    });
  }
  return out;
}
