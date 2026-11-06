"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Star, BadgeCheck } from "lucide-react";
import { StarRating } from "@/components/store/star-rating";
import { Button } from "@/components/ui/button";
import { submitReview } from "@/lib/reviews/actions";
import { summarize, type ReviewView } from "@/lib/reviews/types";

export function ReviewsSection({ productId, slug, reviews }: { productId: string; slug: string; reviews: ReviewView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const s = summarize(reviews);

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await submitReview({ productId, slug, rating, title, body });
      if (res.ok) { setDone(true); setOpen(false); router.refresh(); }
      else setMsg(res.error ?? "Could not submit");
    });
  }

  return (
    <section className="mt-20">
      <h2 className="font-display text-2xl font-semibold">Ratings & reviews</h2>

      <div className="mt-6 grid gap-8 md:grid-cols-[260px_1fr]">
        {/* Summary */}
        <div className="rounded-2xl border border-line p-6">
          {s.count > 0 ? (
            <>
              <div className="flex items-end gap-2">
                <span className="font-display text-4xl font-semibold">{s.average.toFixed(1)}</span>
                <span className="pb-1 text-sm text-ink-soft">/ 5</span>
              </div>
              <StarRating value={s.average} size={18} className="mt-1" />
              <p className="mt-1 text-sm text-ink-soft">{s.count} review{s.count === 1 ? "" : "s"}</p>
              <div className="mt-4 space-y-1.5">
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const n = s.distribution[star];
                  const pct = s.count ? (n / s.count) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="flex w-6 items-center gap-0.5 text-ink-soft">{star}<Star className="h-3 w-3 fill-gold text-gold" /></span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2"><div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} /></div>
                      <span className="w-5 text-right text-ink-soft">{n}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-soft">No reviews yet. Be the first to share your thoughts.</p>
          )}
          <Button variant="outline" className="mt-5 w-full" onClick={() => { setOpen((v) => !v); setDone(false); }}>Write a review</Button>
          {done && <p className="mt-3 text-sm text-mint">Thanks! Your review is pending approval.</p>}
        </div>

        {/* Form + list */}
        <div>
          <AnimatePresence>
            {open && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden rounded-2xl border border-line p-6">
                <p className="mb-2 text-sm font-medium">Your rating</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                      <Star className={`h-7 w-7 ${(hover || rating) >= n ? "fill-gold text-gold" : "text-line"}`} />
                    </button>
                  ))}
                </div>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className="mt-4 h-11 w-full rounded-xl border border-line bg-paper px-3" />
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="What did you think?" className="mt-3 w-full rounded-xl border border-line bg-paper p-3" />
                {msg && <p className="mt-2 text-sm text-accent">{msg}</p>}
                <div className="mt-3 flex gap-2"><Button onClick={submit} disabled={pending}>{pending ? "Submitting…" : "Submit review"}</Button><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
              </motion.div>
            )}
          </AnimatePresence>

          <ul className="space-y-5">
            {reviews.map((r) => (
              <li key={r.id} className="border-b border-line pb-5 last:border-0">
                <div className="flex items-center gap-2">
                  <StarRating value={r.rating} />
                  {r.title && <span className="font-medium">{r.title}</span>}
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
                  {r.author}
                  {r.verified && <span className="inline-flex items-center gap-0.5 text-mint"><BadgeCheck className="h-3.5 w-3.5" /> Verified buyer</span>}
                  · {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(r.created_at))}
                </p>
                {r.body && <p className="mt-2 text-sm text-ink-soft">{r.body}</p>}
              </li>
            ))}
            {reviews.length === 0 && <li className="text-sm text-ink-soft">No reviews yet.</li>}
          </ul>
        </div>
      </div>
    </section>
  );
}
