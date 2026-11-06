import Link from "next/link";
import { getAdminProducts } from "@/lib/admin/catalog-queries";
import { ProductsTable, type ProductRow } from "@/components/admin/products-table";
import { PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { CsvTools } from "@/components/admin/csv-tools";

export default async function AdminProductsPage() {
  const products = await getAdminProducts();
  const rows: ProductRow[] = products.map((p) => ({
    id: p.id, name: p.name, variants: p.product_variants.length,
    stock: p.product_variants.reduce((n, v) => n + Math.max((v.inventory?.on_hand ?? 0) - (v.inventory?.reserved ?? 0), 0), 0),
    fromMinor: p.product_variants.length ? Math.min(...p.product_variants.map((v) => v.price_minor)) : 0,
    currency: p.product_variants[0]?.currency ?? "LKR",
    status: p.status,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        actions={<><CsvTools /><Link href="/admin/products/new"><Button>New product</Button></Link></>}
      />
      <ProductsTable rows={rows} />
    </div>
  );
}
