import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Presentational star rating; supports fractional values via a clipped overlay.
export function StarRating({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className={cn("relative inline-flex", className)} aria-label={`${value.toFixed(1)} out of 5`} style={{ width: size * 5 + 8 }}>
      <span className="flex gap-0.5 text-line">
        {[0, 1, 2, 3, 4].map((i) => <Star key={i} style={{ width: size, height: size }} className="fill-current" />)}
      </span>
      <span className="absolute inset-0 flex gap-0.5 overflow-hidden text-gold" style={{ width: `${pct}%` }}>
        {[0, 1, 2, 3, 4].map((i) => <Star key={i} style={{ width: size, height: size }} className="shrink-0 fill-current" />)}
      </span>
    </span>
  );
}
