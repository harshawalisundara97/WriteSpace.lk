"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Search, X, Clock } from "lucide-react";
import { searchAction } from "@/lib/catalog/search-action";

type Hit = { id: string; name: string; slug: string; brand: string | null; image: string | null };
const RECENT_KEY = "ws_recent_searches";

export function SearchBox({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    const t = setTimeout(async () => {
      setHits(await searchAction(term));
      setLoading(false);
    }, 220);
    return () => clearTimeout(t);
  }, [term]);

  function go(slug: string, query: string) {
    const next = [query, ...recent.filter((r) => r !== query)].slice(0, 5);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
    onClose();
    router.push(`/products/${slug}`);
  }

  function submitSearch(q: string) {
    if (!q.trim()) return;
    const next = [q, ...recent.filter((r) => r !== q)].slice(0, 5);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
    onClose();
    router.push(`/products?q=${encodeURIComponent(q)}`);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    else if (e.key === "Enter") {
      if (active >= 0 && hits[active]) go(hits[active].slug, term);
      else submitSearch(term);
    } else if (e.key === "Escape") onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" onClick={onClose}
        >
          <motion.div
            initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -24, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-24 w-[92%] max-w-xl overflow-hidden rounded-2xl bg-paper shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-5 w-5 text-ink-soft" />
              <input
                ref={inputRef} value={term} onChange={(e) => setTerm(e.target.value)} onKeyDown={onKey}
                placeholder="Search pens, notebooks, art supplies…"
                className="h-14 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-soft"
              />
              <button aria-label="Close" onClick={onClose}><X className="h-5 w-5 text-ink-soft" /></button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-2">
              {term.trim() && hits.length === 0 && !loading && (
                <p className="px-3 py-6 text-center text-sm text-ink-soft">No matches for “{term}”.</p>
              )}
              {!term.trim() && recent.length > 0 && (
                <div className="px-1 py-1">
                  <p className="px-2 py-1 text-xs uppercase tracking-wide text-ink-soft">Recent</p>
                  {recent.map((r) => (
                    <button key={r} onClick={() => { setTerm(r); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-paper-2">
                      <Clock className="h-4 w-4 text-ink-soft" /> {r}
                    </button>
                  ))}
                </div>
              )}
              {hits.map((h, i) => (
                <button
                  key={h.id} onMouseEnter={() => setActive(i)} onClick={() => go(h.slug, term)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${active === i ? "bg-paper-2" : ""}`}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-paper-2 font-display text-ink/40">{h.name.charAt(0)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{h.name}</span>
                    {h.brand && <span className="block text-xs text-ink-soft">{h.brand}</span>}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
