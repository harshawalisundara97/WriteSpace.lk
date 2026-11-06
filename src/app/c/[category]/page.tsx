import { notFound } from "next/navigation";
import { CatalogFilters } from "@/components/store/catalog-filters";
import { ProductGrid } from "@/components/store/product-grid";
import { getAllCategories, getFacets, getProducts } from "@/lib/catalog/queries";

export const revalidate = 60;

type SP = Record<string, string | string[] | undefined>;

export default async function CategoryPage({
  params, searchParams,
}: { params: Promise<{ category: string }>; searchParams: Promise<SP> }) {
  const { category } = await params;
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const categories = await getAllCategories();
  const cat = categories.find((c) => c.slug === category);
  if (!cat) notFound();

  const [{ products, total }, facets] = await Promise.all([
    getProducts({
      category,
      brands: str("brands")?.split(",").filter(Boolean),
      colours: str("colours")?.split(",").filter(Boolean),
      minMinor: str("min") ? Number(str("min")) : undefined,
      maxMinor: str("max") ? Number(str("max")) : undefined,
      inStock: str("inStock") === "1",
      sort: (str("sort") as "newest" | "price_asc" | "price_desc" | "name") ?? "newest",
      pageSize: 24,
    }),
    getFacets({ category }),
  ]);

  return (
    <div className="ws-container py-10">
      <div className="mb-8">
        <nav className="text-sm text-ink-soft"><a href="/products" className="hover:text-accent">Products</a> / {cat.name}</nav>
        <h1 className="mt-2 font-display text-3xl font-semibold">{cat.name}</h1>
        {cat.description && <p className="mt-1 max-w-xl text-sm text-ink-soft">{cat.description}</p>}
        <p className="mt-1 text-sm text-ink-soft">{total} item{total === 1 ? "" : "s"}</p>
      </div>
      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <CatalogFilters facets={facets} categories={categories} hideCategory />
        <div><ProductGrid products={products} /></div>
      </div>
    </div>
  );
}
