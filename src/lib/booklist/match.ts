// Pure, client-safe helpers for the school book-list → cart flow (TASK-NEXT-004a).
// Parses a pasted list into lines (name + quantity) and scores how well a
// product matches a line. Server-side candidate lookup lives in ./actions.ts.

export const MAX_LINES = 100;
export const MAX_QTY = 99;
/** Score at/above which a line's best candidate is auto-selected. */
export const MATCH_THRESHOLD = 0.5;
/** Score at/above which a match is confident (no review prompt). */
export const CONFIDENT_THRESHOLD = 0.75;

export interface BookListLine { index: number; raw: string; name: string; quantity: number }

const BULLET = /^\s*(?:[-*•·–—]|\(?\d{1,3}[.)]|\(?[a-z][.)])\s+/i;
const TRAIL_X = /\s*[-–,:]?\s*[x×]\s*(\d+)\s*$/i;
const TRAIL_UNIT = /\s*[-–,:]?\s*(\d+)\s*(?:nos?|pcs?|pieces?|units?|books?)\.?\s*$/i;
const LEAD_X = /^(\d+)\s*[x×]\s+/i;
const LEAD_BARE = /^(\d{1,2})\s+(?=[a-z])/i;

const clampQty = (n: number) => Math.min(MAX_QTY, Math.max(1, Math.floor(n)));

/** Strip bullets/numbering and pull out a quantity ("x3", "4 nos", "2 x …", "5 Pencils"). */
export function cleanLine(line: string): { name: string; quantity: number } {
  let s = line.trim().replace(BULLET, "").trim();
  let quantity = 1;
  let m: RegExpMatchArray | null;
  if ((m = s.match(TRAIL_X))) { quantity = Number(m[1]); s = s.slice(0, m.index).trim(); }
  else if ((m = s.match(TRAIL_UNIT))) { quantity = Number(m[1]); s = s.slice(0, m.index).trim(); }
  else if ((m = s.match(LEAD_X))) { quantity = Number(m[1]); s = s.slice(m[0].length).trim(); }
  else if ((m = s.match(LEAD_BARE)) && Number(m[1]) <= 20) { quantity = Number(m[1]); s = s.slice(m[0].length).trim(); }
  return { name: s.replace(/\s*[-–,:]\s*$/, "").trim(), quantity: clampQty(quantity) };
}

/** Split pasted text into item lines; drops blanks, headings ("…:") and lines with no letters. */
export function parseBookList(text: string): BookListLine[] {
  const out: BookListLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.endsWith(":") || !/[a-z]/i.test(trimmed)) continue;
    const { name, quantity } = cleanLine(trimmed);
    if (!/[a-z]/i.test(name)) continue;
    out.push({ index: out.length, raw: trimmed, name, quantity });
    if (out.length >= MAX_LINES) break;
  }
  return out;
}

const STOPWORDS = new Set(["the", "and", "for", "with", "per", "each", "of", "a", "an", "nos", "pcs", "pack", "size", "type"]);
const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tokens = (s: string) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);
const stem = (t: string) => (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t);

/** Distinct significant words to feed product search (no stopwords, digits or 1–2 char tokens). */
export function searchTerms(name: string): string[] {
  return Array.from(new Set(tokens(name).filter((t) => t.length >= 3 && !/^\d+$/.test(t) && !STOPWORDS.has(t))));
}

function bigrams(s: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  return out;
}

function dice(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bb = bigrams(b);
  let hits = 0;
  for (const g of bigrams(a)) {
    const i = bb.indexOf(g);
    if (i >= 0) { hits++; bb.splice(i, 1); }
  }
  return (2 * hits) / (a.length + b.length - 2);
}

function tokenSim(q: string, p: string): number {
  if (q === p) return 1;
  if (q.length >= 3 && p.length >= 3 && (p.startsWith(q) || q.startsWith(p))) return 0.9;
  return dice(q, p);
}

export interface MatchTarget { name: string; brand?: string | null }

/** 0–1 similarity between a list line and a product (name + brand). */
export function scoreMatch(query: string, product: MatchTarget): number {
  const qTokens = tokens(query).filter((t) => !STOPWORDS.has(t)).map(stem);
  if (!qTokens.length) return 0;
  const pTokens = tokens(`${product.name} ${product.brand ?? ""}`).map(stem);
  if (!pTokens.length) return 0;
  const avg = qTokens.reduce((s, q) => s + Math.max(...pTokens.map((p) => tokenSim(q, p))), 0) / qTokens.length;
  // "water colour" vs "watercolour": compare with spaces removed too.
  const qc = qTokens.join("");
  const pc = pTokens.join("");
  const compact = qc.length >= 5 && pc.includes(qc) ? 0.85 : 0;
  return Math.round(Math.max(avg, compact) * 1000) / 1000;
}

export interface RankedCandidate<T> { product: T; score: number }

/** Candidates sorted by score (desc), then name. */
export function rankCandidates<T extends MatchTarget>(query: string, candidates: T[]): RankedCandidate<T>[] {
  return candidates
    .map((product) => ({ product, score: scoreMatch(query, product) }))
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));
}

export type LineStatus = "matched" | "review" | "unmatched";

export function lineStatus(score: number | undefined): LineStatus {
  if (score == null || score < MATCH_THRESHOLD) return "unmatched";
  return score >= CONFIDENT_THRESHOLD ? "matched" : "review";
}

export interface ReviewRow { variantId: string | null; quantity: number; include: boolean; unitMinor?: number }

/** Included, matched rows → cart items (same variant merged, quantities clamped). */
export function reviewToCartItems(rows: ReviewRow[]): { variantId: string; quantity: number }[] {
  const merged = new Map<string, number>();
  for (const r of rows) {
    if (!r.include || !r.variantId) continue;
    const q = Number.isFinite(r.quantity) ? clampQty(r.quantity) : 1;
    merged.set(r.variantId, Math.min(MAX_QTY, (merged.get(r.variantId) ?? 0) + q));
  }
  return Array.from(merged, ([variantId, quantity]) => ({ variantId, quantity }));
}

/** Sum of unit × quantity over included, matched rows (list price, before bulk discounts). */
export function reviewSubtotalMinor(rows: ReviewRow[]): number {
  return rows.reduce((s, r) => (r.include && r.variantId ? s + (r.unitMinor ?? 0) * clampQty(r.quantity) : s), 0);
}
