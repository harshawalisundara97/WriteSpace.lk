// Domain row types (hand-maintained; mirror supabase/migrations).
import type { ProductSpecs } from "@/lib/catalog/specs";
import type { PriceTier } from "@/lib/catalog/pricing-tiers";
export type { ProductSpecs } from "@/lib/catalog/specs";
export type { PriceTier } from "@/lib/catalog/pricing-tiers";

export type AgeGroup = "kids" | "adults" | "all";
export type ProductStatus = "draft" | "published";
export type OrderStatus =
  | "pending_payment" | "paid" | "fulfilled" | "shipped"
  | "delivered" | "cancelled" | "refunded" | "partially_refunded";
export type PromoType = "percentage" | "fixed" | "bxgy" | "free_shipping";
export type AppRole = "customer" | "staff" | "admin";

export interface ProductImage {
  url: string;
  alt?: string;
}

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  age_group: AgeGroup;
  position: number;
  is_featured: boolean;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_featured: boolean;
  position: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  name: string | null;
  options: Record<string, string>;
  price_minor: number;
  compare_at_minor: number | null;
  currency: string;
  position: number;
  is_active: boolean;
}

export interface Inventory {
  variant_id: string;
  on_hand: number;
  reserved: number;
  low_stock_threshold: number;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  age_group: AgeGroup;
  status: ProductStatus;
  images: ProductImage[];
  seo_title: string | null;
  seo_description: string | null;
  specs: ProductSpecs;
  price_tiers: PriceTier[];
  created_at: string;
}

// Product joined with its variants + inventory, as the storefront consumes it.
export interface ProductWithVariants extends Product {
  product_variants: (ProductVariant & { inventory: Inventory | null })[];
}

export interface Promotion {
  id: string;
  name: string;
  type: PromoType;
  value: number;
  code: string | null;
  meta: Record<string, unknown>;
  min_subtotal_minor: number;
  usage_limit: number | null;
  per_customer_limit: number | null;
  stackable: boolean;
  priority: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

export interface Banner {
  id: string;
  title: string;
  image_url: string | null;
  link_url: string | null;
  placement: string;
  position: number;
}

// A fully-resolved cart line for pricing (server-trusted).
export interface CartLine {
  variant_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  variant_name: string | null;
  sku: string;
  image: ProductImage | null;
  unit_price_minor: number;
  compare_at_minor: number | null;
  quantity: number;
  available: number;
}

// ---- Bundles & school packs (curated / grade packs) ----
export interface Bundle {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  age_group: AgeGroup;
  grade_label: string | null;          // e.g. "Grade 1–3"
  image_url: string | null;
  bundle_price_minor: number | null;   // null = sum of item prices (no discount)
  is_featured: boolean;
  position: number;
  status: ProductStatus;
  created_at: string;
}

// A bundle line: the chosen product + specific variant + quantity.
export interface BundleItem {
  quantity: number;
  product: ProductWithVariants;
  variant: ProductVariant | null;      // resolved variant (falls back to product's first)
}

export interface BundleWithItems extends Bundle {
  items: BundleItem[];
}
