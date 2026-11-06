"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Search, X, Clock, TrendingUp, CornerDownLeft } from "lucide-react";
import { searchAction } from "@/lib/catalog/search-action";
import type { Category } from "@/lib/types";

type Hit = { id: string; name: string; slug: string; brand: string | null; image: string | null };
const RECENT_KEY = "ws_recent_searches";
const TRENDING = ["Notebooks", "Gel pens", "Watercolour", "Desk organizer", "Crayons"];
const GRADS = ["from-[#ffd9cf] to-[#ffb3a0]", "from-[#d7d4ff] to-[#b3aef0]", "from-[#cdeee6] to-[#9fe0d0]", "from-[#ffe9bd] to-[#ffcf7a]"];
function grad(id: string) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return GRADS[h % GRADS.length]; }

export function SearchBox({ open, onClose, categories = [] }: { open: boolean; onClose: () => void; categories?: Category[] }) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const topCats = useMemo(() => categories.filter((c) => !c.parent_id).slice(0, 6), [categories]);

  useEffect(() => {
    if (open) {
      setTerm(""); setHits([]); setActive(-1);
      try { setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || "[]")); } catch {}
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!term.trim()) { setHits([]); return; }
    setLoading(true);
    const t = setTimeout(async () => { setHits(await searchAction(term)); setLoading(false); }, 200);
    return () => clearTimeout(t);
  }, [term]);

  function remember(q: string) {
    const next = [q, ...recent.filter((r) => r !== q)].slice(0, 5);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
  }
  function goProduct(slug: string) { remember(term); onClose(); router.push(`/products/${slug}`); }
  function searchAll(q: string) { if (!q.trim()) return; remember(q); onClose(); router.push(`/products?q=${encodeURIComponent(q)}`); }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    else if (e.key === "Enter") { if (active >= 0 && hits[active]) goProduct(hits[active].slug); else searchAll(term); }
    else if (e.key === "Escape") onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" onClick={onClose}>
          <motion.div
            initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -24, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-24 w-[92%] max-w-xl overflow-hidden rounded-2xl bg-paper shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-5 w-5 text-ink-soft" />
              <input ref={inputRef} value={term} onChange={(e) => setTerm(e.target.value)} onKeyDown={onKey}
                placeholder="Search pens, notebooks, art supplies…"
                className="h-14 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-soft" />
              <button aria-label="Close" onClick={onClose} className="rounded-md border border-line px-2 py-0.5 text-xs text-ink-soft">esc</button>
            </div>

            <div className="max-h-[56vh] overflow-y-auto p-2">
              {/* Results */}
              {term.trim() && (
                <>
                  {hits.map((h, i) => (
                    <button key={h.id} onMouseEnter={() => setActive(i)} onClick={() => goProduct(h.slug)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${active === i ? "bg-paper-2" : ""}`}>
                      <span className={`grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br font-display text-ink/40 ${grad(h.id)}`}>{h.name.charAt(0)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{h.name}</span>
                        {h.brand && <span className="block text-xs text-ink-soft">{h.brand}</span>}
                      </span>
                    </button>
                  ))}
                  {hits.length === 0 && !loading && <p className="px-3 py-4 text-center text-sm text-ink-soft">No matches for “{term}”.</p>}
                  <button onClick={() => searchAll(term)} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-accent hover:bg-paper-2">
                    <Search className="h-4 w-4" /> Search all results for “{term}”
                  </button>
                </>
              )}

              {/* Empty state */}
              {!term.trim() && (
                <div className="space-y-4 p-1">
                  {recent.length > 0 && (
                    <div>
                      <p className="px-2 py-1 text-xs uppercase tracking-wide text-ink-soft">Recent</p>
                      {recent.map((r) => (
                        <button key={r} onClick={() => setTerm(r)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-paper-2">
                          <Clock className="h-4 w-4 text-ink-soft" /> {r}
                        </button>
                      ))}
                    </div>
                  )}
                  <div>
                    <p className="px-2 py-1 text-xs uppercase tracking-wide text-ink-soft"><TrendingUp className="mr-1 inline h-3.5 w-3.5" /> Trending</p>
                    <div className="flex flex-wrap gap-2 px-2 pt-1">
                      {TRENDING.map((t) => (
                        <button key={t} onClick={() => setTerm(t)} className="rounded-full border border-line px-3 py-1.5 text-sm text-ink-soft hover:border-ink hover:text-ink">{t}</button>
                      ))}
                    </div>
                  </div>
                  {topCats.length > 0 && (
                    <div>
                      <p className="px-2 py-1 text-xs uppercase tracking-wide text-ink-soft">Browse categories</p>
                      <div className="grid grid-cols-2 gap-1">
                        {topCats.map((c) => (
                          <button key={c.id} onClick={() => { onClose(); router.push(`/c/${c.slug}`); }} className="rounded-lg px-3 py-2 text-left text-sm hover:bg-paper-2">{c.name}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-xs text-ink-soft">
              <span className="flex items-center gap-1"><kbd className="rounded border border-line px-1">↑</kbd><kbd className="rounded border border-line px-1">↓</kbd> navigate</span>
              <span className="flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> select</span>
              <span className="ml-auto flex items-center gap-1"><kbd className="rounded border border-line px-1">⌘</kbd><kbd className="rounded border border-line px-1">K</kbd> to open</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
