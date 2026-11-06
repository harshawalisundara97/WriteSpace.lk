"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";

const schema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional().or(z.literal("")),
  body: z.string().max(2000).optional().or(z.literal("")),
  slug: z.string(),
});

export async function submitReview(raw: unknown): Promise<{ ok: boolean; error?: string; pending?: boolean }> {
  if (!hasSupabase()) return { ok: false, error: "Reviews need a connected backend (demo mode)." };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid review" };
  const r = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in to leave a review." };

  // RLS: a customer may insert a review for themselves. Starts unapproved
  // (moderation), so it appears after an admin approves it.
  const { error } = await supabase.from("reviews").insert({
    product_id: r.productId, customer_id: user.id, rating: r.rating,
    title: r.title || null, body: r.body || null, is_approved: false,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "You’ve already reviewed this product." };
    return { ok: false, error: error.message };
  }
  revalidatePath(`/products/${r.slug}`);
  return { ok: true, pending: true };
}
