import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getBundleBySlug, bundlePricing, itemVariant } from "@/lib/catalog/bundles";
import { formatMoney } from "@/lib/pricing/money";
import { BundleAdd } from "@/components/store/bundle-add";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBundleBySlug(slug);
  if (!b) return { title: "Not found" };
  return {
    title: b.name,
    description: b.description ?? undefined,
    alternates: { canonical: `/bundles/${b.slug}` },
  };
}

export default async function BundlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bundle = await getBundleBySlug(slug);
  if (!bundle) notFound();

  const { priceMinor, itemsTotalMinor, savingsMinor, currency } = bundlePricing(bundle);
  const addItems = bundle.items.flatMap((it) => {
    const v = itemVariant(it);
    return v ? [{ variantId: v.id, quantity: it.quantity }] : [];
  });

  return (
    <div className="ws-container py-10">
      <nav className="mb-6 text-sm text-ink-soft">
        <Link href="/bundles" className="hover:text-accent">Bundles &amp; school packs</Link> / <span className="text-ink">{bundle.name}</span>
      </nav>

      <div className="mb-8 max-w-2xl">
        {bundle.grade_label && (
          <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
            {bundle.grade_label}
          </span>
        )}
        <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">{bundle.name}</h1>
        {bundle.description && <p className="mt-3 text-ink-soft">{bundle.description}</p>}
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        {/* included items */}
        <section>
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-ink-soft">
            What&rsquo;s inside ({bundle.items.reduce((n, i) => n + i.quantity, 0)} items)
          </h2>
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {bundle.items.map((it) => {
              const v = itemVariant(it);
              const img = it.product.images?.[0];
              const line = (v?.price_minor ?? 0) * it.quantity;
              return (
                <li key={it.product.id} className="flex items-center gap-4 p-4">
                  <Link
                    href={`/products/${it.product.slug}`}
                    className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-paper-2 font-display text-xl text-ink/30"
                    style={img ? { backgroundImage: `url(${img.url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                  >
                    {!img && it.product.name.charAt(0)}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${it.product.slug}`} className="line-clamp-1 font-medium text-ink hover:text-accent">
                      {it.product.name}
                    </Link>
                    {v?.name && <p className="text-xs text-ink-soft">{v.name}</p>}
                    <p className="text-xs text-ink-soft">Qty {it.quantity}</p>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <p className="font-medium text-ink">{formatMoney(line, currency)}</p>
                    {it.quantity > 1 && v && <p className="text-xs text-ink-soft">{formatMoney(v.price_minor, currency)} each</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line bg-paper-2 p-6">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-ink-soft">Items total</span>
              <span className={savingsMinor > 0 ? "text-ink-soft line-through" : "font-semibold text-ink"}>
                {formatMoney(itemsTotalMinor, currency)}
              </span>
            </div>
            {savingsMinor > 0 && (
              <div className="mt-1 flex items-baseline justify-between text-sm font-medium text-accent">
                <span>Bundle saving</span>
                <span>&minus;{formatMoney(savingsMinor, currency)}</span>
              </div>
            )}
            <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
              <span className="font-medium text-ink">Bundle price</span>
              <span className="font-display text-2xl font-semibold text-ink">{formatMoney(priceMinor, currency)}</span>
            </div>
            <div className="mt-5">
              <BundleAdd items={addItems} />
            </div>
            <p className="mt-3 text-xs text-ink-soft">
              Every item is added to your cart together. You can adjust quantities any time before checkout.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
