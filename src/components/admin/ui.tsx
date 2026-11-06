import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Card({ children, className, padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return <div className={cn("rounded-2xl border border-line bg-paper", padded && "p-5 sm:p-6", className)}>{children}</div>;
}

export function PageHeader({
  title, breadcrumbs, actions, description,
}: { title: string; breadcrumbs?: { label: string; href?: string }[]; actions?: ReactNode; description?: string }) {
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2 flex items-center gap-1.5 text-sm text-ink-soft">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {b.href ? <Link href={b.href} className="hover:text-accent">{b.label}</Link> : <span className="text-ink">{b.label}</span>}
              {i < breadcrumbs.length - 1 && <span className="text-line">/</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";
const TONES: Record<BadgeTone, string> = {
  neutral: "bg-ink/10 text-ink-soft",
  success: "bg-mint/15 text-mint",
  warning: "bg-gold/15 text-gold",
  danger: "bg-accent/15 text-accent",
  info: "bg-brand/10 text-brand",
};
export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  return <span className={cn("inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize", TONES[tone], className)}>{children}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-paper-2", className)} />;
}

export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      {icon && <div className="mb-3 text-ink-soft">{icon}</div>}
      <p className="font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, delta }: { label: string; value: string; delta?: { value: string; positive: boolean } }) {
  return (
    <Card>
      <p className="text-sm text-ink-soft">{label}</p>
      <div className="mt-1 flex items-end justify-between">
        <p className="font-display text-2xl font-semibold">{value}</p>
        {delta && <span className={cn("text-xs font-medium", delta.positive ? "text-mint" : "text-accent")}>{delta.positive ? "▲" : "▼"} {delta.value}</span>}
      </div>
    </Card>
  );
}
