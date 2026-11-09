"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Heart, ShoppingBag, X } from "lucide-react";
import { useWishlist } from "@/components/store/wishlist-provider";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/pricing/money";
import { cn } from "@/lib/utils";

const GRADS = ["from-[#ffd9cf] to-[#ffb3a0]", "from-[#d7d4ff] to-[#b3aef0]", "from-[#cdeee6] to-[#9fe0d0]", "from-[#ffe9bd] to-[#ffcf7a]", "from-[#e9e2d6] to-[#d6c8b2]"];
function grad(id: string) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return GRADS[h % GRADS.length]; }

export default function WishlistPage() {
  const { items, remove } = useWishlist();
  const cart = useCart();

  async function add(e: React.MouseEvent, variantId: string | null) {
    if (!variantId) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    cart.fly({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    await cart.add(variantId, 1, { open: false });
  }

  return (
    <div className="ws-container py-10">
      <h1 className="font-display text-3xl font-semibold">Your wishlist</h1>
      <p className="mt-1 text-sm text-ink-soft">{items.length} saved item{items.length === 1 ? "" : "s"}</p>

      {items.length === 0 ? (
        <div className="mt-10 grid place-items-center rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <Heart className="h-10 w-10 text-ink-soft" />
          <p className="mt-3 font-medium">Nothing saved yet</p>
          <p className="mt-1 text-sm text-ink-soft">Tap the heart on any product to save it here.</p>
          <Link href="/products"><Button className="mt-5">Browse products</Button></Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence>
            {items.map((it) => {
              const onSale = it.compare_at_minor != null && it.compare_at_minor > it.price_minor;
              return (
                <motion.div key={it.productId} layout exit={{ opacity: 0, scale: 0.95 }} className="group relative">
                  <Link href={`/products/${it.slug}`} className="block">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-paper-2">
                      <div className={cn("absolute inset-0 bg-gradient-to-br", !it.imageUrl && grad(it.productId))}
                        style={it.imageUrl ? { backgroundImage: `url(${it.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
                        {!it.imageUrl && <span className="absolute inset-0 grid place-items-center font-display text-5xl text-ink/25">{it.name.charAt(0)}</span>}
                      </div>
                    </div>
                  </Link>
                  <button onClick={() => remove(it.productId)} aria-label="Remove" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-paper/90 text-accent shadow-card backdrop-blur hover:bg-paper">
                    <X className="h-4 w-4" />
                  </button>
                  <div className="mt-3 space-y-1">
                    {it.brand && <p className="text-xs uppercase tracking-wide text-ink-soft">{it.brand}</p>}
                    <h3 className="line-clamp-1 font-medium text-ink">{it.name}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-ink">{formatMoney(it.price_minor, it.currency)}</span>
                      {onSale && <span className="text-sm text-ink-soft line-through">{formatMoney(it.compare_at_minor!, it.currency)}</span>}
                    </div>
                    {it.variantId && <Button size="sm" variant="outline" className="mt-2 w-full" onClick={(e) => add(e, it.variantId)}><ShoppingBag className="h-4 w-4" /> Add to cart</Button>}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
