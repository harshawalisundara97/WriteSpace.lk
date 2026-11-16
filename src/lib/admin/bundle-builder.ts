// Pure, client-safe helpers for the admin bundle builder (search picker +
// live pricing preview). Pricing mirrors `bundlePricing` in
// lib/catalog/bundles.ts so the preview matches what the storefront shows.
import type { ProductWithVariants } from "@/lib/types";

export interface DraftItem { product_id: string; variant_id: string; quantity: string }

/** Lower-case, accent-free text for matching. */
const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Filter products for the picker. Every whitespace-separated term must match
 * the product name, brand, slug, or any variant SKU / name. Products in
 * `excludeIds` (already used in other rows) are omitted. Name-prefix matches
 * sort first, then alphabetical.
 */
export function searchProducts(
  products: ProductWithVariants[],
  query: string,
  excludeIds: ReadonlySet<string> = new Set(),
  limit = 20,
): ProductWithVariants[] {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  const hits = products.filter((p) => {
    if (excludeIds.has(p.id)) return false;
    if (terms.length === 0) return true;
    const hay = norm([p.name, p.brand ?? "", p.slug, ...p.product_variants.flatMap((v) => [v.sku, v.name ?? ""])].join(" "));
    return terms.every((t) => hay.includes(t));
  });
  const first = terms[0];
  hits.sort((a, b) => {
    if (first) {
      const ap = norm(a.name).startsWith(first) ? 0 : 1;
      const bp = norm(b.name).startsWith(first) ? 0 : 1;
      if (ap !== bp) return ap - bp;
    }
    return a.name.localeCompare(b.name);
  });
  return hits.slice(0, limit);
}

/** The variant a draft row resolves to (explicit, else the product's first). */
export function draftVariant(product: ProductWithVariants | undefined, variantId: string) {
  if (!product) return null;
  return (variantId && product.product_variants.find((v) => v.id === variantId)) || product.product_variants[0] || null;
}

export interface DraftLine { unitMinor: number; quantity: number; lineMinor: number }
export interface DraftPricing {
  lines: DraftLine[];
  itemsTotalMinor: number;
  priceMinor: number;
  savingsMinor: number;
  savingsPct: number;       // whole percent, 0 when no saving
  currency: string;
  curated: boolean;         // a valid curated price was entered
  priceAboveItems: boolean; // curated price exceeds the items total (storefront shows no saving)
  invalidPrice: boolean;    // curated price is not a non-negative number
}

/** Parse an LKR major-unit string into integer minor units; null if blank, NaN if invalid. */
export function parsePriceMinor(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
}

export function draftPricing(
  items: DraftItem[],
  priceInput: string,
  productById: (id: string) => ProductWithVariants | undefined,
): DraftPricing {
  let currency = "LKR";
  const lines = items.map((it) => {
    const v = draftVariant(productById(it.product_id), it.variant_id);
    const quantity = Math.max(0, Math.floor(Number(it.quantity) || 0));
    if (v) currency = v.currency ?? currency;
    const unitMinor = v?.price_minor ?? 0;
    return { unitMinor, quantity, lineMinor: unitMinor * quantity };
  });
  const itemsTotalMinor = lines.reduce((s, l) => s + l.lineMinor, 0);
  const parsed = parsePriceMinor(priceInput);
  const invalidPrice = Number.isNaN(parsed);
  const curated = parsed != null && !invalidPrice;
  const priceMinor = curated ? (parsed as number) : itemsTotalMinor;
  const savingsMinor = Math.max(0, itemsTotalMinor - priceMinor);
  return {
    lines,
    itemsTotalMinor,
    priceMinor,
    savingsMinor,
    savingsPct: itemsTotalMinor > 0 ? Math.round((savingsMinor / itemsTotalMinor) * 100) : 0,
    currency,
    curated,
    priceAboveItems: curated && priceMinor > itemsTotalMinor,
    invalidPrice,
  };
}
