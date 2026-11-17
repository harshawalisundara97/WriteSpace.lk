"use server";

// Server side of the book-list matcher (TASK-NEXT-004a): candidate lookup via
// catalog `searchProducts` (demo + Supabase), ranked by the pure scorer.
import { getProductsByIds, searchProducts } from "@/lib/catalog/queries";
import { lineStatus, MATCH_THRESHOLD, parseBookList, rankCandidates, searchTerms, type LineStatus } from "@/lib/booklist/match";

const MAX_INPUT_CHARS = 10_000;
const MAX_TERM_SEARCHES = 3;
const MAX_ALTERNATIVES = 5;

export interface BookListVariant { id: string; name: string | null; priceMinor: number; currency: string; available: number }
export interface BookListProduct { id: string; name: string; slug: string; brand: string | null; image: string | null; variants: BookListVariant[] }
export interface BookListCandidate { product: BookListProduct; score: number }
export interface BookListMatch {
  index: number;
  raw: string;
  name: string;
  quantity: number;
  status: LineStatus;
  best: BookListCandidate | null;
  alternatives: BookListCandidate[];
}

export type MatchBookListResult = { ok: true; lines: BookListMatch[] } | { ok: false; error: string };

type SearchHit = Awaited<ReturnType<typeof searchProducts>>[number];

const toProduct = (p: SearchHit): BookListProduct => ({
  id: p.id, name: p.name, slug: p.slug, brand: p.brand ?? null, image: p.images?.[0]?.url ?? null, variants: [],
});

async function candidatesFor(name: string): Promise<BookListProduct[]> {
  const byId = new Map<string, BookListProduct>();
  const add = (hits: SearchHit[]) => hits.forEach((h) => byId.has(h.id) || byId.set(h.id, toProduct(h)));
  add(await searchProducts(name, 10));
  // Per-word fallback widens recall for loose phrasing ("blue gel pens" → "gel").
  const terms = searchTerms(name).slice(0, MAX_TERM_SEARCHES);
  const perTerm = await Promise.all(terms.map((t) => searchProducts(t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t, 10)));
  perTerm.forEach(add);
  return Array.from(byId.values());
}

export async function matchBookList(text: string): Promise<MatchBookListResult> {
  if (typeof text !== "string" || text.length > MAX_INPUT_CHARS) return { ok: false, error: "List is too long." };
  const lines = parseBookList(text);
  if (!lines.length) return { ok: false, error: "Paste at least one item." };
  try {
    const matched = await Promise.all(lines.map(async (line): Promise<BookListMatch> => {
      const ranked = rankCandidates(line.name, await candidatesFor(line.name)).filter((c) => c.score > 0);
      const top = ranked[0];
      const best = top && top.score >= MATCH_THRESHOLD ? top : null;
      return {
        ...line,
        status: lineStatus(top?.score),
        best,
        alternatives: ranked.slice(best ? 1 : 0, (best ? 1 : 0) + MAX_ALTERNATIVES),
      };
    }));
    await attachVariants(matched);
    return { ok: true, lines: matched };
  } catch {
    return { ok: false, error: "Couldn't match the list right now. Please try again." };
  }
}

// Fill in active variants (price + available stock) for every product we return.
async function attachVariants(lines: BookListMatch[]): Promise<void> {
  const shown = lines.flatMap((l) => [l.best, ...l.alternatives]).filter((c): c is BookListCandidate => !!c);
  const full = await getProductsByIds(shown.map((c) => c.product.id));
  const byId = new Map(full.map((p) => [p.id, p]));
  for (const c of shown) {
    const p = byId.get(c.product.id);
    c.product.variants = (p?.product_variants ?? [])
      .filter((v) => v.is_active !== false)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((v) => ({
        id: v.id, name: v.name, priceMinor: v.price_minor, currency: v.currency ?? "LKR",
        available: Math.max(0, (v.inventory?.on_hand ?? 0) - (v.inventory?.reserved ?? 0)),
      }));
  }
}
