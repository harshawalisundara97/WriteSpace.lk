import { EmptyState } from "@/components/admin/ui";
import { formatMoney } from "@/lib/pricing/money";

const COLORS = ["#3b3a7a", "#ff6b57", "#2fb3a0", "#f4a93a", "#8b5cf6", "#9a97a8"];

export function CategoryBreakdown({ data, currency }: { data: { name: string; revenue: number }[]; currency: string }) {
  if (data.length === 0) return <EmptyState title="No sales yet" hint="Revenue by category will appear here." />;
  const total = data.reduce((s, d) => s + d.revenue, 0) || 1;
  return (
    <ul className="space-y-3">
      {data.map((d, i) => {
        const pct = Math.round((d.revenue / total) * 100);
        return (
          <li key={d.name}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{d.name}</span>
              <span className="text-ink-soft">{formatMoney(d.revenue, currency)} · {pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-paper-2"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} /></div>
          </li>
        );
      })}
    </ul>
  );
}
