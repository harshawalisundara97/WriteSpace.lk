import { ProductForm } from "@/components/admin/product-form";
import { getAdminCategories } from "@/lib/admin/catalog-queries";

export default async function NewProductPage() {
  const categories = await getAdminCategories();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">New product</h1>
      <ProductForm product={null} categories={categories} />
    </div>
  );
}
