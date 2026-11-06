"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePerm } from "@/lib/auth/guards";
import { toMinor } from "@/lib/pricing/money";

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitRow(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitRow(line);
    return Object.fromEntries(headers.map((h, i) => [h.trim(), cells[i] ?? ""]));
  });
}

function splitRow(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

// Upsert products + variants from CSV. Products keyed by slug, variants by SKU.
export async function importProductsCsv(text: string): Promise<{ ok: boolean; created: number; updated: number; error?: string }> {
  const ctx = await requirePerm("products:write");
  const db = createAdminClient();
  const rows = parseCsv(text);
  if (rows.length === 0) return { ok: false, created: 0, updated: 0, error: "No rows found" };

  let created = 0, updated = 0;
  // Group rows by slug.
  const bySlug = new Map<string, Record<string, string>[]>();
  for (const r of rows) {
    if (!r.slug || !r.sku) continue;
    const list = bySlug.get(r.slug) ?? [];
    list.push(r);
    bySlug.set(r.slug, list);
  }

  for (const [slug, group] of bySlug) {
    const first = group[0];
    const { data: existing } = await db.from("products").select("id").eq("slug", slug).maybeSingle();
    const productRow = {
      name: first.name || slug, slug, brand: first.brand || null,
      age_group: ["kids", "adults", "all"].includes(first.age_group) ? first.age_group : "all",
      status: first.status === "published" ? "published" : "draft",
    };
    let productId = existing?.id;
    if (productId) { await db.from("products").update(productRow).eq("id", productId); updated++; }
    else { const { data } = await db.from("products").insert(productRow).select("id").single(); productId = data?.id; created++; }
    if (!productId) continue;

    for (const r of group) {
      const variantRow = {
        product_id: productId, sku: r.sku, name: r.variant_name || null,
        price_minor: toMinor(Number(r.price || 0)),
        compare_at_minor: r.compare_at ? toMinor(Number(r.compare_at)) : null,
      };
      const { data: v } = await db.from("product_variants").upsert(variantRow, { onConflict: "sku" }).select("id").single();
      if (v?.id) {
        await db.from("inventory").upsert({ variant_id: v.id, on_hand: Number(r.stock || 0) }, { onConflict: "variant_id" });
      }
    }
  }

  await db.from("audit_logs").insert({ actor: ctx.userId, action: "products.import", entity: "products", after: { created, updated } });
  revalidatePath("/admin/products");
  revalidatePath("/products");
  return { ok: true, created, updated };
}
