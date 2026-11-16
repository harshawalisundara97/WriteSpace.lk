import { getAdminBundles } from "@/lib/admin/bundle-queries";
import { getAdminProducts } from "@/lib/admin/catalog-queries";
import { BundlesManager } from "@/components/admin/bundles-manager";
import { PageHeader } from "@/components/admin/ui";

export default async function AdminBundlesPage() {
  const [bundles, products] = await Promise.all([getAdminBundles(), getAdminProducts()]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bundles & school packs"
        description="Curated sets of existing products sold together, with an optional curated price."
      />
      <BundlesManager bundles={bundles} products={products} />
    </div>
  );
}
