"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, Check, Undo2, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/admin/toast";
import { setReviewApproval, deleteReview } from "@/lib/admin/review-actions";
import type { AdminReview } from "@/lib/admin/catalog-queries";

type Filter = "pending" | "approved" | "all";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-line"}`}
        />
      ))}
    </span>
  );
}

const fmt = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

export function ReviewsModeration({ reviews }: { reviews: AdminReview[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<Filter>("pending");

  const counts = useMemo(
    () => ({
      pending: reviews.filter((r) => !r.is_approved).length,
      approved: reviews.filter((r) => r.is_approved).length,
      all: reviews.length,
    }),
    [reviews],
  );

  const rows = useMemo(() => {
    if (filter === "pending") return reviews.filter((r) => !r.is_approved);
    if (filter === "approved") return reviews.filter((r) => r.is_approved);
    return reviews;
  }, [reviews, filter]);

  function approve(r: AdminReview, approved: boolean) {
    start(async () => {
      const res = await setReviewApproval(r.id, approved);
      if (res.ok) {
        router.refresh();
        toast(approved ? "Review approved" : "Review hidden");
      } else {
        toast(res.error ?? "Failed", "error");
      }
    });
  }

  function remove(r: AdminReview) {
    start(async () => {
      const res = await deleteReview(r.id);
      if (res.ok) {
        router.refresh();
        toast("Review deleted");
      } else {
        toast(res.error ?? "Failed", "error");
      }
    });
  }

  const tabs: { key: Filter; label: string }[] = [
    { key: "pending", label: `Pending (${counts.pending})` },
    { key: "approved", label: `Approved (${counts.approved})` },
    { key: "all", label: `All (${counts.all})` },
  ];

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-xl border border-line p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              filter === t.key ? "bg-brand text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-ink-soft">
          {filter === "pending" ? "No reviews waiting for moderation. 🎉" : "No reviews here."}
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Stars rating={r.rating} />
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        r.is_approved ? "bg-brand/10 text-brand" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {r.is_approved ? "Approved" : "Pending"}
                    </span>
                  </div>
                  {r.title && <p className="mt-1.5 font-medium">{r.title}</p>}
                  {r.body && <p className="mt-0.5 text-sm text-ink-soft">{r.body}</p>}
                  <p className="mt-2 text-xs text-ink-soft">
                    {r.author} · {fmt(r.created_at)} ·{" "}
                    {r.product_slug ? (
                      <Link href={`/products/${r.product_slug}`} className="inline-flex items-center gap-0.5 hover:text-ink">
                        {r.product_name} <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      r.product_name
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.is_approved ? (
                    <Button size="sm" variant="ghost" onClick={() => approve(r, false)} disabled={pending}>
                      <Undo2 className="h-4 w-4" /> Hide
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => approve(r, true)} disabled={pending}>
                      <Check className="h-4 w-4" /> Approve
                    </Button>
                  )}
                  <button
                    className="rounded-lg p-2 text-ink-soft hover:bg-paper-2 hover:text-accent"
                    title="Delete"
                    onClick={() => remove(r)}
                    disabled={pending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
