import type { Metadata } from "next";
import { getBundles } from "@/lib/catalog/bundles";
import { BundleCard } from "@/components/store/bundle-card";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Bundles & school packs",
  description: "Curated stationery bundles and grade-by-grade school packs — everything on the list, added to your cart in one click.",
  alternates: { canonical: "/bundles" },
};

export default async function BundlesPage() {
  const bundles = await getBundles();

  return (
    <div className="ws-container py-10">
      <div className="mb-8 max-w-2xl">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Bundles &amp; school packs</h1>
        <p className="mt-2 text-ink-soft">
          Curated sets for every stage — grade packs for the new term and ready-made kits for home and office.
          Add the whole pack to your cart in one click.
        </p>
      </div>

      {bundles.length === 0 ? (
        <p className="py-12 text-center text-ink-soft">No bundles available right now.</p>
      ) : (
        <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {bundles.map((b) => <BundleCard key={b.id} bundle={b} />)}
        </div>
      )}
    </div>
  );
}
