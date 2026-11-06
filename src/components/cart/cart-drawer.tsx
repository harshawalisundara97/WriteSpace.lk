"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { X, Minus, Plus, Trash2, Tag } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { getCartSummary, type CartSummary } from "@/lib/cart/summary";
import { updateCartItem, removeCartItem, setPromoCode } from "@/lib/cart/actions";
import { formatMoney } from "@/lib/pricing/money";
import { Button } from "@/components/ui/button";

export function CartDrawer() {
  const cart = useCart();
  const [summary, setSummary] = useState<CartSummary | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [pending, startTransition] = useTransition();

  async function reload() {
    const s = await getCartSummary();
    setSummary(s);
    setCodeInput(s.code ?? "");
    await cart.refresh();
  }

  useEffect(() => {
    if (cart.isOpen) void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.isOpen]);

  function changeQty(variantId: string, qty: number) {
    startTransition(async () => { await updateCartItem(variantId, qty); await reload(); });
  }
  function remove(variantId: string) {
    startTransition(async () => { await removeCartItem(variantId); await reload(); });
  }
  function applyCode() {
    startTransition(async () => { await setPromoCode(codeInput || null); await reload(); });
  }

  const lines = summary?.lines ?? [];
  const totals = summary?.totals;
  const currency = summary?.currency ?? "LKR";
  const threshold = summary?.freeShippingThreshold ?? null;
  const progress =
    threshold && totals ? Math.min(100, Math.round((Math.max(totals.subtotal_minor - totals.discount_minor, 0) / threshold) * 100)) : null;
  const remaining = threshold && totals ? Math.max(threshold - (totals.subtotal_minor - totals.discount_minor), 0) : 0;

  return (
    <AnimatePresence>
      {cart.isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" onClick={cart.close}>
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 40 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-paper shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-lg font-semibold">Your cart</h2>
              <button aria-label="Close cart" onClick={cart.close} className="grid h-9 w-9 place-items-center rounded-full hover:bg-paper-2"><X className="h-5 w-5" /></button>
            </div>

            {progress !== null && lines.length > 0 && (
              <div className="border-b border-line px-5 py-3">
                <p className="mb-2 text-xs text-ink-soft">
                  {remaining > 0 ? <>Add <strong>{formatMoney(remaining, currency)}</strong> for free shipping</> : <>You’ve unlocked free shipping! 🎉</>}
                </p>
                <div className="h-1.5 overflow-hidden rounded-full bg-paper-2">
                  <motion.div className="h-full rounded-full bg-mint" animate={{ width: `${progress}%` }} transition={{ ease: [0.22,1,0.36,1] }} />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {lines.length === 0 ? (
                <div className="grid h-full place-items-center text-center text-ink-soft">
                  <div>
                    <p className="font-medium text-ink">Your cart is empty</p>
                    <p className="mt-1 text-sm">Find something lovely to write with.</p>
                    <Button className="mt-4" variant="outline" onClick={cart.close}>Browse products</Button>
                  </div>
                </div>
              ) : (
                <ul className="space-y-4">
                  <AnimatePresence initial={false}>
                    {lines.map((l) => (
                      <motion.li
                        key={l.variant_id} layout
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="flex gap-3"
                      >
                        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-paper-2 font-display text-ink/40">{l.product_name.charAt(0)}</span>
                        <div className="min-w-0 flex-1">
                          <Link href={`/products/${l.product_slug}`} onClick={cart.close} className="line-clamp-1 text-sm font-medium hover:text-accent">{l.product_name}</Link>
                          {l.variant_name && <p className="text-xs text-ink-soft">{l.variant_name}</p>}
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex items-center rounded-full border border-line">
                              <button disabled={pending} onClick={() => changeQty(l.variant_id, l.quantity - 1)} className="grid h-7 w-7 place-items-center"><Minus className="h-3.5 w-3.5" /></button>
                              <span className="w-6 text-center text-sm">{l.quantity}</span>
                              <button disabled={pending || l.quantity >= l.available} onClick={() => changeQty(l.variant_id, l.quantity + 1)} className="grid h-7 w-7 place-items-center disabled:opacity-40"><Plus className="h-3.5 w-3.5" /></button>
                            </div>
                            <button disabled={pending} onClick={() => remove(l.variant_id)} aria-label="Remove" className="text-ink-soft hover:text-accent"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                        <span className="text-sm font-semibold">{formatMoney(l.unit_price_minor * l.quantity, currency)}</span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {lines.length > 0 && totals && (
              <div className="border-t border-line px-5 py-4">
                <div className="mb-3 flex gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-full border border-line px-3">
                    <Tag className="h-4 w-4 text-ink-soft" />
                    <input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="Promo code" className="h-10 flex-1 bg-transparent text-sm outline-none uppercase placeholder:normal-case placeholder:text-ink-soft" />
                  </div>
                  <Button variant="outline" size="sm" onClick={applyCode} disabled={pending}>Apply</Button>
                </div>
                <dl className="space-y-1 text-sm">
                  <Row label="Subtotal" value={formatMoney(totals.subtotal_minor, currency)} />
                  {totals.discount_minor > 0 && <Row label="Discount" value={`− ${formatMoney(totals.discount_minor, currency)}`} accent />}
                  <Row label="Shipping" value={totals.shipping_minor === 0 ? "Free" : formatMoney(totals.shipping_minor, currency)} />
                  {totals.tax_minor > 0 && <Row label="Tax" value={formatMoney(totals.tax_minor, currency)} />}
                </dl>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <span className="font-medium">Total</span>
                  <span className="font-display text-lg font-semibold">{formatMoney(totals.total_minor, currency)}</span>
                </div>
                <Link href="/checkout" onClick={cart.close} className="mt-4 block">
                  <Button className="w-full" size="lg">Checkout</Button>
                </Link>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={accent ? "text-accent" : "text-ink"}>{value}</dd>
    </div>
  );
}
