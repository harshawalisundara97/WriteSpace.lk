import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { PdpBuy } from "@/components/store/pdp-buy";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductGrid } from "@/components/store/product-grid";
import { SectionHeader } from "@/components/store/section-header";
import { StarRating } from "@/components/store/star-rating";
import { ReviewsSection } from "@/components/store/reviews-section";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog/queries";
import { getProductReviews } from "@/lib/reviews/queries";
import { summarize } from "@/lib/reviews/types";

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

  const [related, reviews] = await Promise.all([
    getRelatedProducts(product.category_id, product.id, 4),
    getProductReviews(product.id),
  ]);
  const summary = summarize(reviews);
  const variants = product.product_variants ?? [];
  const price = Math.min(...variants.map((v) => v.price_minor));
  const currency = variants[0]?.currency ?? "LKR";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    brand: product.brand ?? undefined,
    sku: variants[0]?.sku,
    ...(summary.count > 0 && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: summary.average.toFixed(1), reviewCount: summary.count },
    }),
    offers: { "@type": "Offer", priceCurrency: currency, price: (price / 100).toFixed(2), availability: "https://schema.org/InStock" },
  };

  return (
    <div className="ws-container py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="mb-6 text-sm text-ink-soft">
        <Link href="/products" className="hover:text-accent">Products</Link> / <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images ?? []} name={product.name} productId={product.id} />

        <div className="lg:sticky lg:top-24 lg:self-start">
          {product.brand && <p className="text-sm uppercase tracking-wide text-ink-soft">{product.brand}</p>}
          <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">{product.name}</h1>
          {summary.count > 0 && (
            <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
              <StarRating value={summary.average} /> <span>{summary.average.toFixed(1)} · {summary.count} review{summary.count === 1 ? "" : "s"}</span>
            </a>
          )}
          {product.description && <p className="mt-4 text-ink-soft">{product.description}</p>}
          <div className="mt-6"><PdpBuy variants={variants} currency={currency} /></div>
        </div>
      </div>

      <div id="reviews" className="scroll-mt-24">
        <ReviewsSection productId={product.id} slug={slug} reviews={reviews} />
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
