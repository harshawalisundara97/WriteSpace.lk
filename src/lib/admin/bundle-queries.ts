import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/env";
import type { BundleWithItems } from "@/lib/types";
import { BUNDLE_SELECT, shapeBundle, type RawBundleRow } from "@/lib/catalog/bundles";
import { demoBundles, demoBundleById } from "@/lib/demo/data";

// Admin bundle reads. Unlike the storefront queries these use the service-role
// client (bypasses RLS) and return ALL bundles regardless of status, so drafts
// are visible/editable in the admin.

export async function getAdminBundles(): Promise<BundleWithItems[]> {
  if (!hasSupabase()) return demoBundles();
  const db = createAdminClient();
  const { data } = await db.from("bundles").select(BUNDLE_SELECT).order("position");
  return ((data ?? []) as unknown as RawBundleRow[]).map(shapeBundle);
}

export async function getAdminBundle(id: string): Promise<BundleWithItems | null> {
  if (!hasSupabase()) return demoBundleById(id);
  const db = createAdminClient();
  const { data } = await db.from("bundles").select(BUNDLE_SELECT).eq("id", id).maybeSingle();
  return data ? shapeBundle(data as unknown as RawBundleRow) : null;
}
