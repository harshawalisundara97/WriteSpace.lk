import { z } from "zod";

export const variantSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().min(1, "SKU required").max(60),
  name: z.string().max(120).optional().or(z.literal("")),
  price_minor: z.number().int().min(0),
  compare_at_minor: z.number().int().min(0).nullable().optional(),
  on_hand: z.number().int().min(0),
  low_stock_threshold: z.number().int().min(0).default(5),
  is_active: z.boolean().default(true),
});

export const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "Name required").max(200),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  description: z.string().max(5000).optional().or(z.literal("")),
  brand: z.string().max(120).optional().or(z.literal("")),
  category_id: z.string().uuid().nullable().optional(),
  age_group: z.enum(["kids", "adults", "all"]),
  status: z.enum(["draft", "published"]),
  images: z.array(z.object({ url: z.string().url(), alt: z.string().optional() })).default([]),
  seo_title: z.string().max(200).optional().or(z.literal("")),
  seo_description: z.string().max(300).optional().or(z.literal("")),
  variants: z.array(variantSchema).min(1, "Add at least one variant"),
});

export type ProductInput = z.infer<typeof productSchema>;
export type VariantInput = z.infer<typeof variantSchema>;
