"use server";

import { searchProducts } from "@/lib/catalog/queries";

export async function searchAction(term: string) {
  const products = await searchProducts(term, 8);
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    image: p.images?.[0]?.url ?? null,
  }));
}
