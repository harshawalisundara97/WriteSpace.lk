"use server";

import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import type { WishlistItem } from "@/components/store/wishlist-provider";

const SELECT =
  "product:products(id,slug,name,brand,images,product_variants(id,price_minor,compare_at_minor,currency,position,is_active))";

type Row = {
  product: {
    id: string; slug: string; name: string; brand: string | null;
    images: { url: string; alt?: string }[] | null;
    product_variants: { id: string; price_minor: number; compare_at_minor: number | null; currency: string; position: number; is_active: boolean }[];
  } | null;
};

function toItem(p: NonNullable<Row["product"]>): WishlistItem {
  const v = [...(p.product_variants ?? [])].sort((a, b) => a.position - b.position)[0];
  return {
    productId: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    variantId: v?.id ?? null,
    price_minor: v?.price_minor ?? 0,
    compare_at_minor: v?.compare_at_minor ?? null,
    currency: v?.currency ?? "LKR",
    imageUrl: p.images?.[0]?.url ?? null,
  };
}

// Current user's saved items as full WishlistItems (for hydration + the page).
export async function getWishlistItems(): Promise<WishlistItem[]> {
  if (!hasSupabase()) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("wishlists").select(SELECT).order("created_at", { ascending: false });
  return ((data ?? []) as unknown as Row[]).map((r) => r.product).filter(Boolean).map((p) => toItem(p!));
}

export async function addToWishlist(productId: string): Promise<{ ok: boolean }> {
  if (!hasSupabase()) return { ok: false };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  await supabase.from("wishlists").upsert({ customer_id: user.id, product_id: productId });
  return { ok: true };
}

export async function removeFromWishlist(productId: string): Promise<{ ok: boolean }> {
  if (!hasSupabase()) return { ok: false };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  await supabase.from("wishlists").delete().eq("customer_id", user.id).eq("product_id", productId);
  return { ok: true };
}

// Merge a set of local product ids into the account (on sign-in sync).
export async function syncWishlist(productIds: string[]): Promise<{ ok: boolean }> {
  if (!hasSupabase() || productIds.length === 0) return { ok: false };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const rows = productIds.map((product_id) => ({ customer_id: user.id, product_id }));
  await supabase.from("wishlists").upsert(rows, { onConflict: "customer_id,product_id", ignoreDuplicates: true });
  return { ok: true };
}
