import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { getAdminProduct, getAdminCategories } from "@/lib/admin/catalog-queries";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getAdminProduct(id), getAdminCategories()]);
  if (!product) notFound();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Edit product</h1>
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
