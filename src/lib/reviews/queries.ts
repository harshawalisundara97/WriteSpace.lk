import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import { demoProductReviews } from "@/lib/demo/data";
import type { ReviewView } from "@/lib/reviews/types";

export async function getProductReviews(productId: string): Promise<ReviewView[]> {
  if (!hasSupabase()) return demoProductReviews(productId);
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("id,rating,title,body,created_at,customer:customers(full_name)")
    .eq("product_id", productId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(50);
  type Row = { id: string; rating: number; title: string | null; body: string | null; created_at: string; customer: { full_name: string | null } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id, rating: r.rating, title: r.title, body: r.body,
    author: r.customer?.full_name ?? "Verified buyer", created_at: r.created_at, verified: true,
  }));
}
