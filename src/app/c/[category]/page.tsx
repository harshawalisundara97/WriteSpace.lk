import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CatalogFilters } from "@/components/store/catalog-filters";
import { ProductGrid } from "@/components/store/product-grid";
import { getAllCategories, getFacets, getProducts } from "@/lib/catalog/queries";
import { SPEC_FIELDS, type SpecKey } from "@/lib/catalog/specs";

export const revalidate = 60;

type SP = Record<string, string | string[] | undefined>;

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const categories = await getAllCategories();
  const cat = categories.find((c) => c.slug === category);
  if (!cat) return { title: "Not found" };
  const description = cat.description ?? `Shop ${cat.name} at WriteSpace.lk — stationery for kids & adults, delivered across Sri Lanka.`;
  return {
    title: cat.name,
    description,
    alternates: { canonical: `/c/${cat.slug}` },
    openGraph: { title: `${cat.name} · WriteSpace.lk`, description, type: "website" },
  };
}

export default async function CategoryPage({
  params, searchParams,
}: { params: Promise<{ category: string }>; searchParams: Promise<SP> }) {
  const { category } = await params;
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const categories = await getAllCategories();
  const cat = categories.find((c) => c.slug === category);
  if (!cat) notFound();

  const specs: Partial<Record<SpecKey, string[]>> = {};
  for (const f of SPEC_FIELDS) { const v = str(f.key)?.split(",").filter(Boolean); if (v?.length) specs[f.key] = v; }

  const [{ products, total }, facets] = await Promise.all([
    getProducts({
      category,
      brands: str("brands")?.split(",").filter(Boolean),
      colours: str("colours")?.split(",").filter(Boolean),
      minMinor: str("min") ? Number(str("min")) : undefined,
      maxMinor: str("max") ? Number(str("max")) : undefined,
      inStock: str("inStock") === "1",
      specs,
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
