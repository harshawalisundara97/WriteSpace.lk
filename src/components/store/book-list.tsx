"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Search, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/cart-provider";
import { formatMoney } from "@/lib/pricing/money";
import { MAX_QTY, reviewSubtotalMinor, reviewToCartItems } from "@/lib/booklist/match";
import { matchBookList, type BookListMatch, type BookListProduct } from "@/lib/booklist/actions";

interface Row { productId: string | null; variantId: string | null; quantity: number; include: boolean }

const EXAMPLE = "1. A5 dotted notebook x4\n2. Gel pens - 2 nos\n3. Jumbo crayons\n4. Watercolour set";

const choices = (l: BookListMatch): BookListProduct[] =>
  [l.best?.product, ...l.alternatives.map((a) => a.product)].filter((p): p is BookListProduct => !!p);
const firstInStock = (p: BookListProduct | undefined) => p?.variants.find((v) => v.available > 0) ?? p?.variants[0];

function initialRow(l: BookListMatch): Row {
  const p = l.best?.product;
  const v = firstInStock(p);
  return { productId: p?.id ?? null, variantId: v?.id ?? null, quantity: l.quantity, include: !!v && v.available > 0 };
}

export function BookListClient() {
  const cart = useCart();
  const [text, setText] = useState("");
  const [lines, setLines] = useState<BookListMatch[] | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [matching, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const res = await matchBookList(text);
      if (res.ok) { setLines(res.lines); setRows(res.lines.map(initialRow)); setError(null); }
      else { setLines(null); setError(res.error); }
    });
  }

  const productOf = (i: number) => (lines ? choices(lines[i]).find((p) => p.id === rows[i]?.productId) : undefined);
  const variantOf = (i: number) => productOf(i)?.variants.find((v) => v.id === rows[i]?.variantId);
  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  function pickProduct(i: number, productId: string) {
    if (!productId || !lines) return setRow(i, { productId: null, variantId: null, include: false });
    const p = choices(lines[i]).find((x) => x.id === productId);
    setRow(i, { productId, variantId: firstInStock(p)?.id ?? null, include: true });
  }

  const priced = rows.map((r, i) => ({ ...r, unitMinor: variantOf(i)?.priceMinor }));
  const items = reviewToCartItems(priced);
  const subtotal = reviewSubtotalMinor(priced);
  const counts = { matched: 0, review: 0, unmatched: 0 };
  lines?.forEach((l) => { counts[l.status]++; });

  async function addAll(e: React.MouseEvent) {
    setMessage(null);
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    cart.fly({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    const res = await cart.addMany(items);
    if (!res.ok) return setMessage({ ok: false, text: res.error ?? "Could not add to cart" });
    const n = res.added ?? items.length;
    setMessage({
      ok: true,
      text: `Added ${n} item${n === 1 ? "" : "s"} to your cart.${res.skipped ? ` ${res.skipped} skipped — not enough stock.` : ""}`,
    });
  }

  const input = "rounded-xl border border-line bg-paper px-3 text-sm outline-none focus:border-brand";

  return (
    <div className="mt-8 space-y-8">
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-paper p-5">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ink">Your book list</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} required rows={8} maxLength={10000}
            placeholder={EXAMPLE} className={`${input} w-full py-3 font-mono leading-relaxed`} />
        </label>
        <p className="text-xs text-ink-soft">Tip: add quantities like “x3” or “4 nos”. Headings ending in “:” are ignored. Up to 100 items.</p>
        {error && <p role="alert" className="text-sm text-accent">{error}</p>}
        <Button type="submit" disabled={matching || !text.trim()} className="w-full sm:w-auto">
          <Search className="h-4 w-4" />{matching ? "Matching…" : lines ? "Match again" : "Find my items"}
        </Button>
      </form>

      {lines && (
        <section aria-live="polite" className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-semibold text-ink">Check your matches</h2>
            <p className="text-sm text-ink-soft">
              {counts.matched} matched · {counts.review} to check · {counts.unmatched} not found
            </p>
          </div>

          <ul className="divide-y divide-line rounded-2xl border border-line bg-paper">
            {lines.map((l, i) => {
              const row = rows[i];
              const opts = choices(l);
              const product = productOf(i);
              const variant = variantOf(i);
              return (
                <li key={l.index} className={`space-y-3 p-4 ${row.include ? "" : "opacity-70"}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={row.include} disabled={!row.variantId}
                      onChange={(e) => setRow(i, { include: e.target.checked })}
                      aria-label={`Include ${l.name}`} className="mt-1 h-4 w-4 accent-brand" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs text-ink-soft" title={l.raw}>{l.raw}</p>
                      {l.status === "review" && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-accent"><AlertTriangle className="h-3.5 w-3.5" />Please check this match</p>
                      )}
                      {l.status === "unmatched" && (
                        <p className="mt-1 text-xs text-accent">
                          Not found{opts.length ? " — pick a close match or skip" : ""}.{" "}
                          <Link href={`/products?q=${encodeURIComponent(l.name)}`} className="underline" target="_blank">Search the shop</Link>
                        </p>
                      )}
                    </div>
                  </div>

                  {opts.length > 0 && (
                    <div className="grid gap-2 pl-7 sm:grid-cols-[1fr_auto_auto]">
                      <select value={row.productId ?? ""} onChange={(e) => pickProduct(i, e.target.value)}
                        aria-label={`Product for ${l.name}`} className={`${input} h-10 min-w-0`}>
                        <option value="">Skip this item</option>
                        {opts.map((p) => <option key={p.id} value={p.id}>{p.name}{p.brand ? ` · ${p.brand}` : ""}</option>)}
                      </select>
                      {product && product.variants.length > 1 ? (
                        <select value={row.variantId ?? ""} onChange={(e) => setRow(i, { variantId: e.target.value })}
                          aria-label={`Option for ${l.name}`} className={`${input} h-10`}>
                          {product.variants.map((v) => (
                            <option key={v.id} value={v.id} disabled={v.available === 0}>
                              {v.name ?? "Standard"}{v.available === 0 ? " (out of stock)" : ""}
                            </option>
                          ))}
                        </select>
                      ) : <span className="hidden sm:block" />}
                      <div className="flex items-center gap-2">
                        <input type="number" min={1} max={MAX_QTY} value={row.quantity}
                          onChange={(e) => setRow(i, { quantity: Math.max(1, Math.min(MAX_QTY, Number(e.target.value) || 1)) })}
                          aria-label={`Quantity for ${l.name}`} className={`${input} h-10 w-20`} />
                        {variant && (
                          <span className="whitespace-nowrap text-sm font-medium text-ink">{formatMoney(variant.priceMinor * row.quantity, variant.currency)}</span>
                        )}
                      </div>
                      {variant && variant.available === 0 && <p className="text-xs text-accent sm:col-span-3">Out of stock</p>}
                      {variant && variant.available > 0 && variant.available < row.quantity && (
                        <p className="text-xs text-accent sm:col-span-3">Only {variant.available} left</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper p-3 shadow-lift sm:p-4">
            <div>
              <p className="text-sm text-ink-soft">{items.length} item{items.length === 1 ? "" : "s"} selected</p>
              <p className="font-display text-lg font-semibold text-ink">{formatMoney(subtotal)}</p>
              <p className="hidden text-xs text-ink-soft sm:block">Bulk discounts apply in the cart.</p>
            </div>
            <div className="space-y-1 text-right">
              <Button onClick={addAll} disabled={cart.adding || items.length === 0}>
                {message?.ok ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                {cart.adding ? "Adding…" : "Add all to cart"}
              </Button>
              {message && <p role="status" className={`text-xs ${message.ok ? "text-ink-soft" : "text-accent"}`}>{message.text}</p>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
