import Link from "next/link";
import { getAdminProducts } from "@/lib/admin/catalog-queries";
import { formatMoney } from "@/lib/pricing/money";
import { Button } from "@/components/ui/button";
import { CsvTools } from "@/components/admin/csv-tools";

export default async function AdminProductsPage() {
  const products = await getAdminProducts();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Products</h1>
        <div className="flex items-center gap-3">
          <CsvTools />
          <Link href="/admin/products/new"><Button>New product</Button></Link>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-paper-2 text-left text-ink-soft">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Variants</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">From</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody>
            {products.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-soft">No products yet.</td></tr>}
            {products.map((p) => {
              const prices = p.product_variants.map((v) => v.price_minor);
              const stock = p.product_variants.reduce((n, v) => n + Math.max((v.inventory?.on_hand ?? 0) - (v.inventory?.reserved ?? 0), 0), 0);
              return (
                <tr key={p.id} className="border-t border-line hover:bg-paper-2/50">
                  <td className="px-4 py-3"><Link href={`/admin/products/${p.id}`} className="font-medium text-accent hover:underline">{p.name}</Link></td>
                  <td className="px-4 py-3 text-ink-soft">{p.product_variants.length}</td>
                  <td className="px-4 py-3 text-ink-soft">{stock}</td>
                  <td className="px-4 py-3">{prices.length ? formatMoney(Math.min(...prices), p.product_variants[0]?.currency ?? "LKR") : "—"}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${p.status === "published" ? "bg-mint/15 text-mint" : "bg-ink/10 text-ink-soft"}`}>{p.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
