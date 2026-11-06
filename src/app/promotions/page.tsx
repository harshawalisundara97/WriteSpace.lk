import { ProductGrid } from "@/components/store/product-grid";
import { SectionHeader } from "@/components/store/section-header";
import { getActivePromotions, getCollectionProducts } from "@/lib/catalog/queries";
import { formatMoney } from "@/lib/pricing/money";

export const revalidate = 60;
export const metadata = { title: "Promotions & deals" };

export default async function PromotionsPage() {
  const [promotions, deals] = await Promise.all([
    getActivePromotions(),
    getCollectionProducts("deals-of-the-day", 8),
  ]);

  const label = (p: (typeof promotions)[number]) => {
    if (p.type === "percentage") return `${p.value}% off`;
    if (p.type === "fixed") return `${formatMoney(p.value)} off`;
    if (p.type === "free_shipping") return "Free shipping";
    return "Special deal";
  };

  return (
    <div className="ws-container py-10">
      <h1 className="font-display text-3xl font-semibold">Promotions & deals</h1>
      <p className="mt-1 text-sm text-ink-soft">Active offers you can use right now.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {promotions.map((p) => (
          <div key={p.id} className="rounded-2xl border border-line bg-paper-2 p-5">
            <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">{label(p)}</span>
            <h3 className="mt-3 font-medium text-ink">{p.name}</h3>
            {p.code && <p className="mt-2 text-sm text-ink-soft">Code: <span className="rounded bg-paper px-2 py-0.5 font-mono font-medium text-ink">{p.code}</span></p>}
            {p.min_subtotal_minor > 0 && <p className="mt-1 text-xs text-ink-soft">Min spend {formatMoney(p.min_subtotal_minor)}</p>}
          </div>
        ))}
      </div>

      {deals.length > 0 && (
        <section className="mt-16">
          <SectionHeader title="On sale now" />
          <ProductGrid products={deals} />
        </section>
      )}
    </div>
  );
}
