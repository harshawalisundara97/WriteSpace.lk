import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PdpBuy } from "@/components/store/pdp-buy";
import { ProductGrid } from "@/components/store/product-grid";
import { SectionHeader } from "@/components/store/section-header";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog/queries";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Not found" };
  return {
    title: p.seo_title ?? p.name,
    description: p.seo_description ?? p.description ?? undefined,
    openGraph: { title: p.name, images: p.images?.[0]?.url ? [p.images[0].url] : [] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.category_id, product.id, 4);
  const variants = product.product_variants ?? [];
  const price = Math.min(...variants.map((v) => v.price_minor));
  const currency = variants[0]?.currency ?? "LKR";
  const img = product.images?.[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    brand: product.brand ?? undefined,
    sku: variants[0]?.sku,
    offers: {
      "@type": "Offer",
      priceCurrency: currency,
      price: (price / 100).toFixed(2),
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="ws-container py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="mb-6 text-sm text-ink-soft">
        <a href="/products" className="hover:text-accent">Products</a> / <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-paper-2 to-[#e8ded0]"
          style={img ? { backgroundImage: `url(${img.url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
          {!img && <span className="grid h-full place-items-center font-display text-7xl text-ink/20">{product.name.charAt(0)}</span>}
        </div>

        <div>
          {product.brand && <p className="text-sm uppercase tracking-wide text-ink-soft">{product.brand}</p>}
          <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">{product.name}</h1>
          {product.description && <p className="mt-4 text-ink-soft">{product.description}</p>}
          <div className="mt-6"><PdpBuy variants={variants} currency={currency} /></div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <SectionHeader title="You might also like" />
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
