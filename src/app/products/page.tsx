import { CatalogFilters } from "@/components/store/catalog-filters";
import { ProductGrid } from "@/components/store/product-grid";
import { getAllCategories, getBrands, getProducts } from "@/lib/catalog/queries";

export const metadata = { title: "All products" };

type SP = Record<string, string | string[] | undefined>;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const filters = {
    q: str("q"),
    category: str("category"),
    ageGroup: (str("age") as "kids" | "adults" | undefined) ?? undefined,
    brands: str("brands")?.split(",").filter(Boolean),
    minMinor: str("min") ? Number(str("min")) : undefined,
    maxMinor: str("max") ? Number(str("max")) : undefined,
    inStock: str("inStock") === "1",
    sort: (str("sort") as "newest" | "price_asc" | "price_desc" | "name") ?? "newest",
    page: str("page") ? Number(str("page")) : 1,
    pageSize: 24,
  };

  const [{ products, total }, brands, categories] = await Promise.all([
    getProducts(filters), getBrands(), getAllCategories(),
  ]);

  return (
    <div className="ws-container py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold">{filters.q ? `Results for “${filters.q}”` : "All products"}</h1>
        <p className="mt-1 text-sm text-ink-soft">{total} item{total === 1 ? "" : "s"}</p>
      </div>
      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <CatalogFilters brands={brands} categories={categories} />
        <div><ProductGrid products={products} /></div>
      </div>
    </div>
  );
}
