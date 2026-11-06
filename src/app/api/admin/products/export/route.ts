import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/auth/guards";
import { getAdminProducts } from "@/lib/admin/catalog-queries";
import { toMajor } from "@/lib/pricing/money";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const products = await getAdminProducts();
  const header = ["name", "slug", "brand", "age_group", "status", "sku", "variant_name", "price", "compare_at", "stock"];
  const rows = [header.join(",")];
  for (const p of products) {
    for (const v of p.product_variants) {
      rows.push([
        p.name, p.slug, p.brand ?? "", p.age_group, p.status,
        v.sku, v.name ?? "", toMajor(v.price_minor),
        v.compare_at_minor != null ? toMajor(v.compare_at_minor) : "",
        v.inventory?.on_hand ?? 0,
      ].map(csvCell).join(","));
    }
  }
  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
