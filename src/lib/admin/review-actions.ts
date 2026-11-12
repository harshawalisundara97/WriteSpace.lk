"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePerm } from "@/lib/auth/guards";

export async function setReviewApproval(id: string, approved: boolean): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requirePerm("products:write");
  const db = createAdminClient();
  const { error } = await db.from("reviews").update({ is_approved: approved }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({
    actor: ctx.userId,
    action: approved ? "review.approve" : "review.unapprove",
    entity: "reviews",
    entity_id: id,
  });
  revalidatePath("/admin/reviews");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteReview(id: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requirePerm("products:write");
  const db = createAdminClient();
  const { error } = await db.from("reviews").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await db.from("audit_logs").insert({ actor: ctx.userId, action: "review.delete", entity: "reviews", entity_id: id });
  revalidatePath("/admin/reviews");
  revalidatePath("/", "layout");
  return { ok: true };
}
