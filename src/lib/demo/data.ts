import type {
  Banner, Category, Collection, ProductWithVariants, Promotion,
} from "@/lib/types";

// In-repo demo dataset mirroring supabase/seed.sql, used when Supabase isn't
// configured so the storefront is viewable with zero setup.

const now = new Date().toISOString();

export const demoCategories: Category[] = [
  { id: "c1", parent_id: null, name: "Writing & Pens", slug: "writing-pens", description: null, age_group: "all", position: 1, is_featured: true },
  { id: "c2", parent_id: null, name: "Notebooks & Paper", slug: "notebooks-paper", description: null, age_group: "all", position: 2, is_featured: true },
  { id: "c3", parent_id: null, name: "Art & Craft", slug: "art-craft", description: null, age_group: "all", position: 3, is_featured: true },
  { id: "c4", parent_id: null, name: "Kids Corner", slug: "kids-corner", description: "Bright, safe supplies for little hands.", age_group: "kids", position: 4, is_featured: true },
  { id: "c5", parent_id: null, name: "Office & Desk", slug: "office-desk", description: null, age_group: "adults", position: 5, is_featured: true },
];

export const demoCollections: Collection[] = [
  { id: "k1", name: "Back to School", slug: "back-to-school", description: null, is_featured: true, position: 1 },
  { id: "k2", name: "New Arrivals", slug: "new-arrivals", description: null, is_featured: true, position: 2 },
  { id: "k3", name: "Deals of the Day", slug: "deals-of-the-day", description: null, is_featured: true, position: 3 },
];

function product(
  id: string, cat: string, name: string, slug: string, brand: string,
  age: "kids" | "adults" | "all", desc: string,
  variants: { sku: string; name?: string; price: number; compareAt?: number; stock: number }[],
): ProductWithVariants {
  return {
    id, category_id: cat, name, slug, description: desc, brand, age_group: age,
    status: "published", images: [], seo_title: null, seo_description: null, created_at: now,
    product_variants: variants.map((v, i) => ({
      id: `${id}-v${i}`, product_id: id, sku: v.sku, name: v.name ?? null, options: {},
      price_minor: v.price, compare_at_minor: v.compareAt ?? null, currency: "LKR",
      position: i, is_active: true,
      inventory: { variant_id: `${id}-v${i}`, on_hand: v.stock, reserved: 0, low_stock_threshold: 5 },
    })),
  };
}

export const demoProducts: ProductWithVariants[] = [
  product("p1", "c4", "Rainbow Gel Pens (12-pack)", "rainbow-gel-pens-12", "DooWrite", "kids",
    "Smooth-writing glitter gel pens in 12 vivid colours. Perfect for kids' journals and doodles.",
    [{ sku: "WS-GEL-12", name: "12-pack", price: 85000, compareAt: 120000, stock: 120 }]),
  product("p2", "c1", "Classic Fountain Pen", "classic-fountain-pen", "Inkwell", "adults",
    "Brushed-steel fountain pen with a fine nib. Gift-boxed with two ink cartridges.",
    [{ sku: "WS-FP-BLK", name: "Black / Fine", price: 345000, stock: 40 }]),
  product("p3", "c2", "A5 Dotted Notebook", "a5-dotted-notebook", "PaperCo", "all",
    "160gsm bleed-proof dotted pages, lay-flat binding, elastic closure. Ideal for bullet journaling.",
    [{ sku: "WS-NB-A5-TEAL", name: "A5 / Teal", price: 150000, stock: 75 }, { sku: "WS-NB-A5-BLK", name: "A5 / Black", price: 150000, stock: 3 }]),
  product("p4", "c3", "Watercolour Paint Set (24)", "watercolour-set-24", "ArtLab", "all",
    "24 half-pans of vibrant, blendable watercolour with a travel brush. Non-toxic.",
    [{ sku: "WS-WC-24", name: "24 half-pans", price: 275000, compareAt: 320000, stock: 60 }]),
  product("p5", "c4", "Jumbo Crayons (24)", "jumbo-crayons-24", "DooWrite", "kids",
    "Chunky, easy-grip crayons for little hands. Washable and non-toxic.",
    [{ sku: "WS-CRAY-24", name: "24-pack", price: 62000, stock: 200 }]),
  product("p6", "c5", "Bamboo Desk Organizer", "bamboo-desk-organizer", "DeskLife", "adults",
    "Minimalist bamboo caddy with slots for pens, phone, notes and clips. Sustainably sourced.",
    [{ sku: "WS-ORG-BMB", name: "Natural bamboo", price: 420000, compareAt: 520000, stock: 35 }]),
];

const COLLECTION_MEMBERS: Record<string, string[]> = {
  "back-to-school": ["p1", "p5"],
  "new-arrivals": ["p3", "p2"],
  "deals-of-the-day": ["p1", "p4", "p6"],
};

export function demoCollectionProducts(slug: string): ProductWithVariants[] {
  const ids = COLLECTION_MEMBERS[slug] ?? [];
  return demoProducts.filter((p) => ids.includes(p.id));
}

export const demoBanners: Banner[] = [
  { id: "b1", title: "Back to School — up to 30% off", image_url: null, link_url: "/c/kids-corner", placement: "home_hero", position: 1 },
  { id: "b2", title: "New journals just landed", image_url: null, link_url: "/products/a5-dotted-notebook", placement: "home_hero", position: 2 },
  { id: "b3", title: "Free delivery over LKR 5,000", image_url: null, link_url: "/promotions", placement: "promo_strip", position: 1 },
];

const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 0);

export const demoPromotions: Promotion[] = [
  { id: "promo1", name: "Welcome 10%", type: "percentage", value: 10, code: "WELCOME10", meta: {}, min_subtotal_minor: 0, usage_limit: null, per_customer_limit: null, stackable: false, priority: 10, is_active: true, starts_at: null, ends_at: null },
  { id: "promo2", name: "Deal of the Day -15%", type: "percentage", value: 15, code: null, meta: {}, min_subtotal_minor: 0, usage_limit: null, per_customer_limit: null, stackable: false, priority: 20, is_active: true, starts_at: null, ends_at: endOfDay.toISOString() },
  { id: "promo3", name: "Free shipping over LKR 5,000", type: "free_shipping", value: 0, code: null, meta: {}, min_subtotal_minor: 500000, usage_limit: null, per_customer_limit: null, stackable: true, priority: 5, is_active: true, starts_at: null, ends_at: null },
];

export const demoSettings = {
  flat_shipping_minor: 35000,
  free_shipping_threshold_minor: 500000,
  tax_rate_bps: 0,
  currency: "LKR",
  store_name: "WriteSpace.lk",
};
