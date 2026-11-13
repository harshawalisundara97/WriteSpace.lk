"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ShoppingBag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/cart-provider";

// Adds every item of a bundle to the cart at once.
export function BundleAdd({
  items,
  label = "Add all to cart",
}: {
  items: { variantId: string; quantity: number }[];
  label?: string;
}) {
  const cart = useCart();
  const [added, setAdded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function add(e: React.MouseEvent) {
    setMessage(null);
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    cart.fly({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    const res = await cart.addMany(items);
    if (res.ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
      if (res.skipped) setMessage(`${res.skipped} item${res.skipped === 1 ? "" : "s"} skipped — out of stock.`);
    } else {
      setMessage(res.error ?? "Could not add to cart");
    }
  }

  return (
    <div className="space-y-2">
      <Button size="lg" variant="accent" className="w-full" onClick={add} disabled={cart.adding || items.length === 0}>
        <motion.span key={added ? "added" : "add"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
          {added ? <><Check className="h-5 w-5" /> Added to cart</> : <><ShoppingBag className="h-5 w-5" /> {label}</>}
        </motion.span>
      </Button>
      {message && <p className="text-sm text-ink-soft">{message}</p>}
    </div>
  );
}
