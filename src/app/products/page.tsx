import { CatalogFilters } from "@/components/store/catalog-filters";
import { ProductGrid } from "@/components/store/product-grid";
import { getAllCategories, getFacets, getProducts } from "@/lib/catalog/queries";
import { SPEC_FIELDS, type SpecKey } from "@/lib/catalog/specs";

export const metadata = { title: "All products" };

type SP = Record<string, string | string[] | undefined>;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const ageGroup = (str("age") as "kids" | "adults" | undefined) ?? undefined;
  const category = str("category");
  const specs: Partial<Record<SpecKey, string[]>> = {};
  for (const f of SPEC_FIELDS) { const v = str(f.key)?.split(",").filter(Boolean); if (v?.length) specs[f.key] = v; }

  const filters = {
    q: str("q"), category, ageGroup,
    brands: str("brands")?.split(",").filter(Boolean),
    colours: str("colours")?.split(",").filter(Boolean),
    minMinor: str("min") ? Number(str("min")) : undefined,
    maxMinor: str("max") ? Number(str("max")) : undefined,
    inStock: str("inStock") === "1",
    specs,
    sort: (str("sort") as "newest" | "price_asc" | "price_desc" | "name") ?? "newest",
    page: str("page") ? Number(str("page")) : 1,
    pageSize: 24,
  };

  const [{ products, total }, facets, categories] = await Promise.all([
    getProducts(filters), getFacets({ category, ageGroup }), getAllCategories(),
  ]);

  return (
    <div className="ws-container py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold">{filters.q ? `Results for “${filters.q}”` : "All products"}</h1>
        <p className="mt-1 text-sm text-ink-soft">{total} item{total === 1 ? "" : "s"}</p>
      </div>
      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <CatalogFilters facets={facets} categories={categories} />
        <div><ProductGrid products={products} /></div>
      </div>
    </div>
  );
}
