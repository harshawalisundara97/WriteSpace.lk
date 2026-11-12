import { getAdminCategories, getAdminCollections } from "@/lib/admin/catalog-queries";
import { CategoriesManager } from "@/components/admin/categories-manager";
import { PageHeader } from "@/components/admin/ui";
import type { Collection } from "@/lib/types";

export default async function AdminCategoriesPage() {
  const [categories, collections] = await Promise.all([getAdminCategories(), getAdminCollections()]);
  return (
    <div className="space-y-6">
      <PageHeader title="Categories & collections" description="Organize how products are grouped and surfaced on the storefront." />
      <CategoriesManager categories={categories} collections={collections as Collection[]} />
    </div>
  );
}
