import { ProductCard } from "@/components/store/product-card";
import type { ProductWithVariants } from "@/lib/types";

export function ProductGrid({ products }: { products: ProductWithVariants[] }) {
  if (!products.length) return <p className="py-12 text-center text-ink-soft">No products here yet.</p>;
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} index={i} />
      ))}
    </div>
  );
}
