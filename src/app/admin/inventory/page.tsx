import Link from "next/link";
import { getAdminInventory } from "@/lib/admin/inventory";
import { getStockAlertDemand } from "@/lib/stock-alerts/queries";
import { InventoryTable } from "@/components/admin/inventory-table";
import { PageHeader, Card } from "@/components/admin/ui";

export default async function AdminInventoryPage() {
  const [rows, demand] = await Promise.all([getAdminInventory(), getStockAlertDemand()]);
  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description="Stock on hand across every variant. Edit a value and save to adjust." />
      {demand.length > 0 && (
        <Card>
          <h2 className="font-medium">Back-in-stock requests</h2>
          <p className="mb-4 text-sm text-ink-soft">Shoppers waiting for these items. Adding stock emails them once, automatically.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-ink-soft"><th className="py-2 pr-4 font-medium">Product</th><th className="py-2 pr-4 font-medium">SKU</th><th className="py-2 pr-4 text-right font-medium">Waiting</th><th className="py-2 pr-4 text-right font-medium">Available</th><th className="py-2 font-medium">Since</th></tr></thead>
              <tbody>
                {demand.map((d) => (
                  <tr key={d.variant_id} className="border-t border-line">
                    <td className="py-2 pr-4"><Link href={`/products/${d.product_slug}`} target="_blank" className="hover:underline">{d.product_name}</Link>{d.variant_name && <span className="text-ink-soft"> · {d.variant_name}</span>}</td>
                    <td className="py-2 pr-4 text-ink-soft">{d.sku}</td>
                    <td className="py-2 pr-4 text-right font-semibold tabular-nums">{d.waiting}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{d.available}</td>
                    <td className="py-2 text-ink-soft">{new Date(d.oldest).toLocaleDateString("en-GB")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <InventoryTable rows={rows} />
    </div>
  );
}
