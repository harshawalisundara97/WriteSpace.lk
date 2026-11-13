import Link from "next/link";
import { Layers } from "lucide-react";
import type { BundleWithItems } from "@/lib/types";
import { bundlePricing } from "@/lib/catalog/bundles";
import { formatMoney } from "@/lib/pricing/money";
import { cn } from "@/lib/utils";

const GRADIENTS = [
  "from-[#ffd9cf] to-[#ffb3a0]",
  "from-[#d7d4ff] to-[#b3aef0]",
  "from-[#cdeee6] to-[#9fe0d0]",
  "from-[#ffe9bd] to-[#ffcf7a]",
  "from-[#e9e2d6] to-[#d6c8b2]",
];

function hashIndex(id: string, mod: number) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % mod;
}

export function BundleCard({ bundle }: { bundle: BundleWithItems }) {
  const { priceMinor, itemsTotalMinor, savingsMinor, currency } = bundlePricing(bundle);
  const count = bundle.items.reduce((n, i) => n + i.quantity, 0);
  const grad = GRADIENTS[hashIndex(bundle.id, GRADIENTS.length)];

  return (
    <Link href={`/bundles/${bundle.slug}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-paper-2">
        <div
          className={cn("absolute inset-0 bg-gradient-to-br transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-105", grad)}
          style={bundle.image_url ? { backgroundImage: `url(${bundle.image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          {!bundle.image_url && (
            <span className="absolute inset-0 grid place-items-center text-ink/25">
              <Layers className="h-12 w-12" />
            </span>
          )}
        </div>
        {bundle.grade_label && (
          <span className="absolute left-3 top-3 rounded-full bg-paper/90 px-2.5 py-1 text-xs font-semibold text-ink shadow-card backdrop-blur">
            {bundle.grade_label}
          </span>
        )}
        {savingsMinor > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-white shadow-card">
            Save {formatMoney(savingsMinor, currency)}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <h3 className="line-clamp-1 font-medium text-ink">{bundle.name}</h3>
        <p className="text-xs text-ink-soft">{count} item{count === 1 ? "" : "s"}</p>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-ink">{formatMoney(priceMinor, currency)}</span>
          {savingsMinor > 0 && <span className="text-sm text-ink-soft line-through">{formatMoney(itemsTotalMinor, currency)}</span>}
        </div>
      </div>
    </Link>
  );
}
