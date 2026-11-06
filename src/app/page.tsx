import Link from "next/link";
import { Hero } from "@/components/store/hero";
import { SectionHeader } from "@/components/store/section-header";
import { ProductGrid } from "@/components/store/product-grid";
import { DealsCountdown } from "@/components/store/deals-countdown";
import {
  getActiveBanners, getActivePromotions, getCollectionProducts,
  getFeaturedCategories,
} from "@/lib/catalog/queries";

export const revalidate = 60;

export default async function HomePage() {
  const [heroBanners, promoStrip, categories, deals, newArrivals, bts, promotions] = await Promise.all([
    getActiveBanners("home_hero"),
    getActiveBanners("promo_strip"),
    getFeaturedCategories(),
    getCollectionProducts("deals-of-the-day", 4),
    getCollectionProducts("new-arrivals", 4),
    getCollectionProducts("back-to-school", 4),
    getActivePromotions(),
  ]);

  const dealPromo = promotions.find((p) => p.name.toLowerCase().includes("deal of the day") && p.ends_at);

  return (
    <>
      <Hero banners={heroBanners} />

      {promoStrip.length > 0 && (
        <div className="mt-4 bg-brand text-paper">
          <div className="ws-container flex items-center justify-center gap-3 py-2.5 text-sm">
            <span className="font-medium">{promoStrip[0].title}</span>
            {promoStrip[0].link_url && <Link href={promoStrip[0].link_url} className="underline underline-offset-2">Shop</Link>}
          </div>
        </div>
      )}

      {/* Shop by category */}
      <section className="ws-container mt-16">
        <SectionHeader title="Shop by category" href="/products" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`}
              className="group rounded-2xl border border-line bg-paper-2 p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-card">
              <span className="font-display text-lg font-semibold text-ink group-hover:text-accent">{c.name}</span>
              <p className="mt-1 text-xs text-ink-soft">{c.age_group === "all" ? "For everyone" : `For ${c.age_group}`}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Deals of the day */}
      {deals.length > 0 && (
        <section className="ws-container mt-16">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Deals of the day</h2>
              <p className="mt-1 text-sm text-ink-soft">Limited-time prices — grab them before they’re gone.</p>
            </div>
            {dealPromo?.ends_at && <DealsCountdown endsAt={dealPromo.ends_at} />}
          </div>
          <ProductGrid products={deals} />
        </section>
      )}

      {/* New arrivals */}
      {newArrivals.length > 0 && (
        <section className="ws-container mt-16">
          <SectionHeader title="New arrivals" subtitle="Fresh picks for your desk" href="/products?sort=newest" />
          <ProductGrid products={newArrivals} />
        </section>
      )}

      {/* Back to school */}
      {bts.length > 0 && (
        <section className="ws-container mt-16">
          <SectionHeader title="Back to school" href="/c/kids-corner" />
          <ProductGrid products={bts} />
        </section>
      )}
    </>
  );
}
