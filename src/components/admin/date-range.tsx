"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const RANGES = [[7, "7 days"], [30, "30 days"], [90, "90 days"]] as const;

export function DateRange() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = Number(params.get("range") ?? 7);

  function set(days: number) {
    const next = new URLSearchParams(params.toString());
    next.set("range", String(days));
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="inline-flex rounded-full border border-line bg-paper p-0.5">
      {RANGES.map(([days, label]) => (
        <button key={days} onClick={() => set(days)}
          className={cn("rounded-full px-3 py-1.5 text-sm transition-colors", current === days ? "bg-brand text-paper" : "text-ink-soft hover:text-ink")}>
          {label}
        </button>
      ))}
    </div>
  );
}
