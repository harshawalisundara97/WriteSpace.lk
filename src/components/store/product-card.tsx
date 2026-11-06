"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ShoppingBag, Check } from "lucide-react";
import { useState } from "react";
import type { ProductWithVariants } from "@/lib/types";
import { formatMoney } from "@/lib/pricing/money";
import { useCart } from "@/components/cart/cart-provider";
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

export function ProductCard({ product, index = 0 }: { product: ProductWithVariants; index?: number }) {
  const cart = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const variants = product.product_variants ?? [];
  const primary = variants[0];
  const price = Math.min(...variants.map((v) => v.price_minor));
  const compareAt = primary?.compare_at_minor ?? null;
  const onSale = compareAt != null && compareAt > price;
  const isNew = Date.now() - new Date(product.created_at).getTime() < 1000 * 60 * 60 * 24 * 14;
  const available = variants.reduce((n, v) => n + Math.max((v.inventory?.on_hand ?? 0) - (v.inventory?.reserved ?? 0), 0), 0);
  const lowStock = available > 0 && available <= 5;
  const soldOut = available <= 0;
  const currency = primary?.currency ?? "LKR";
  const img = product.images?.[0];
  const grad = GRADIENTS[hashIndex(product.id, GRADIENTS.length)];

  async function quickAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (!primary || soldOut) return;
    const res = await cart.add(primary.id, 1);
    if (res.ok) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1400);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: Math.min(index * 0.05, 0.3) }}
      className="group relative"
    >
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-paper-2">
          {/* image / placeholder */}
          <div
            className={cn("absolute inset-0 bg-gradient-to-br transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-105", grad)}
            style={img ? { backgroundImage: `url(${img.url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          >
            {!img && (
              <span className="absolute inset-0 grid place-items-center font-display text-5xl text-ink/25">
                {product.name.charAt(0)}
              </span>
            )}
          </div>

          {/* badges */}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {onSale && <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-white shadow-card">Sale</span>}
            {isNew && !onSale && <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-semibold text-paper shadow-card">New</span>}
            {lowStock && <span className="rounded-full bg-gold px-2.5 py-1 text-xs font-semibold text-ink shadow-card">Only {available} left</span>}
            {soldOut && <span className="rounded-full bg-ink/80 px-2.5 py-1 text-xs font-semibold text-paper">Sold out</span>}
          </div>

          {/* quick add */}
          {!soldOut && (
            <button
              onClick={quickAdd}
              aria-label={`Add ${product.name} to cart`}
              className="absolute bottom-3 right-3 grid h-11 w-11 translate-y-2 place-items-center rounded-full bg-ink text-paper opacity-0 shadow-lift transition-all duration-300 ease-[var(--ease-out-soft)] group-hover:translate-y-0 group-hover:opacity-100 hover:bg-accent focus-visible:translate-y-0 focus-visible:opacity-100"
            >
              {justAdded ? <Check className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
            </button>
          )}
        </div>

        <div className="mt-3 space-y-1">
          {product.brand && <p className="text-xs uppercase tracking-wide text-ink-soft">{product.brand}</p>}
          <h3 className="line-clamp-1 font-medium text-ink">{product.name}</h3>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-ink">{formatMoney(price, currency)}</span>
            {onSale && <span className="text-sm text-ink-soft line-through">{formatMoney(compareAt!, currency)}</span>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
