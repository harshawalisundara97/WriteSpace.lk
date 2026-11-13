"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CartLine } from "@/lib/types";
import { hasSupabase } from "@/lib/env";
import { normalizeTiers, tierUnitPrice, type PriceTier } from "@/lib/catalog/pricing-tiers";

const CART_COOKIE = "ws_cart";
const CODE_COOKIE = "ws_promo";

async function currentUserId(): Promise<string | null> {
  if (!hasSupabase()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// Resolve (or create) the active cart id for this visitor.
async function resolveCartId(create = true): Promise<string | null> {
  if (!hasSupabase()) return null;
  const db = createAdminClient();
  const jar = await cookies();
  const userId = await currentUserId();

  if (userId) {
    const { data: existing } = await db.from("carts").select("id").eq("customer_id", userId).limit(1).maybeSingle();
    if (existing) return existing.id;
    if (!create) return null;
    const { data } = await db.from("carts").insert({ customer_id: userId }).select("id").single();
    return data?.id ?? null;
  }

  const token = jar.get(CART_COOKIE)?.value;
  if (token) {
    const { data } = await db.from("carts").select("id").eq("anon_token", token).limit(1).maybeSingle();
    if (data) return data.id;
  }
  if (!create) return null;
  const newToken = crypto.randomUUID();
  const { data } = await db.from("carts").insert({ anon_token: newToken }).select("id").single();
  jar.set(CART_COOKIE, newToken, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return data?.id ?? null;
}

export async function getCartLines(): Promise<CartLine[]> {
  const cartId = await resolveCartId(false);
  if (!cartId) return [];
  const db = createAdminClient();
  const { data } = await db
    .from("cart_items")
    .select(
      "quantity,variant:product_variants(id,sku,name,price_minor,compare_at_minor," +
        "inventory(on_hand,reserved),product:products(id,name,slug,images,price_tiers))",
    )
    .eq("cart_id", cartId);

  type Row = {
    quantity: number;
    variant: {
      id: string; sku: string; name: string | null; price_minor: number; compare_at_minor: number | null;
      inventory: { on_hand: number; reserved: number } | null;
      product: { id: string; name: string; slug: string; images: { url: string; alt?: string }[]; price_tiers: PriceTier[] | null } | null;
    } | null;
  };

  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.variant && r.variant.product)
    .map((r) => {
      const v = r.variant!;
      const p = v.product!;
      const avail = (v.inventory?.on_hand ?? 0) - (v.inventory?.reserved ?? 0);
      // Bulk pricing: effective unit price for this line's quantity (server-trusted).
      const base = v.price_minor;
      const unit = tierUnitPrice(base, r.quantity, normalizeTiers(p.price_tiers));
      return {
        variant_id: v.id,
        product_id: p.id,
        product_name: p.name,
        product_slug: p.slug,
        variant_name: v.name,
        sku: v.sku,
        image: p.images?.[0] ?? null,
        unit_price_minor: unit,
        compare_at_minor: v.compare_at_minor ?? (unit < base ? base : null),
        quantity: r.quantity,
        available: avail,
      } satisfies CartLine;
    });
}

export async function getCartCount(): Promise<number> {
  const lines = await getCartLines();
  return lines.reduce((n, l) => n + l.quantity, 0);
}

export async function addToCart(variantId: string, quantity = 1) {
  if (quantity <= 0) return { ok: false, error: "Invalid quantity" };
  if (!hasSupabase()) return { ok: false, error: "Demo mode — connect Supabase to enable the cart" };
  const db = createAdminClient();
  const cartId = await resolveCartId(true);
  if (!cartId) return { ok: false, error: "Could not create cart" };

  const { data: inv } = await db.from("inventory").select("on_hand,reserved").eq("variant_id", variantId).maybeSingle();
  const available = (inv?.on_hand ?? 0) - (inv?.reserved ?? 0);

  const { data: existing } = await db
    .from("cart_items").select("id,quantity").eq("cart_id", cartId).eq("variant_id", variantId).maybeSingle();
  const nextQty = (existing?.quantity ?? 0) + quantity;
  if (nextQty > available) return { ok: false, error: "Not enough stock" };

  if (existing) {
    await db.from("cart_items").update({ quantity: nextQty }).eq("id", existing.id);
  } else {
    await db.from("cart_items").insert({ cart_id: cartId, variant_id: variantId, quantity });
  }
  revalidatePath("/", "layout");
  return { ok: true, count: await getCartCount() };
}

// Add several variants at once (bundles / school packs). Quantities for the
// same variant are merged; each is clamped to available stock. Returns how many
// distinct lines were added and how many were skipped for lack of stock.
export async function addManyToCart(items: { variantId: string; quantity: number }[]) {
  if (!hasSupabase()) return { ok: false, error: "Demo mode — connect Supabase to enable the cart" };
  const merged = new Map<string, number>();
  for (const it of items) {
    if (!it.variantId || it.quantity <= 0) continue;
    merged.set(it.variantId, (merged.get(it.variantId) ?? 0) + it.quantity);
  }
  if (merged.size === 0) return { ok: false, error: "Nothing to add" };

  const db = createAdminClient();
  const cartId = await resolveCartId(true);
  if (!cartId) return { ok: false, error: "Could not create cart" };

  let added = 0, skipped = 0;
  for (const [variantId, quantity] of merged) {
    const { data: inv } = await db.from("inventory").select("on_hand,reserved").eq("variant_id", variantId).maybeSingle();
    const available = (inv?.on_hand ?? 0) - (inv?.reserved ?? 0);
    const { data: existing } = await db
      .from("cart_items").select("id,quantity").eq("cart_id", cartId).eq("variant_id", variantId).maybeSingle();
    const nextQty = (existing?.quantity ?? 0) + quantity;
    if (nextQty > available) { skipped++; continue; }
    if (existing) await db.from("cart_items").update({ quantity: nextQty }).eq("id", existing.id);
    else await db.from("cart_items").insert({ cart_id: cartId, variant_id: variantId, quantity });
    added++;
  }
  revalidatePath("/", "layout");
  if (added === 0) return { ok: false, error: "Not enough stock", count: await getCartCount() };
  return { ok: true, added, skipped, count: await getCartCount() };
}

export async function updateCartItem(variantId: string, quantity: number) {
  const db = createAdminClient();
  const cartId = await resolveCartId(false);
  if (!cartId) return { ok: false, error: "No cart" };
  if (quantity <= 0) {
    await db.from("cart_items").delete().eq("cart_id", cartId).eq("variant_id", variantId);
  } else {
    const { data: inv } = await db.from("inventory").select("on_hand,reserved").eq("variant_id", variantId).maybeSingle();
    const available = (inv?.on_hand ?? 0) - (inv?.reserved ?? 0);
    if (quantity > available) return { ok: false, error: "Not enough stock" };
    await db.from("cart_items").update({ quantity }).eq("cart_id", cartId).eq("variant_id", variantId);
  }
  revalidatePath("/", "layout");
  return { ok: true, count: await getCartCount() };
}

export async function removeCartItem(variantId: string) {
  return updateCartItem(variantId, 0);
}

export async function setPromoCode(code: string | null) {
  const jar = await cookies();
  if (code) jar.set(CODE_COOKIE, code.trim().toUpperCase(), { sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
  else jar.delete(CODE_COOKIE);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function getPromoCode(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(CODE_COOKIE)?.value ?? null;
}
