import Link from "next/link";
import { getDashboardMetrics } from "@/lib/admin/queries";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { DateRange } from "@/components/admin/date-range";
import { CategoryBreakdown } from "@/components/admin/category-breakdown";
import { PageHeader, Card, StatCard, EmptyState } from "@/components/admin/ui";
import { StatusBadge } from "@/components/store/status-badge";
import { formatMoney } from "@/lib/pricing/money";
import type { OrderStatus } from "@/lib/types";

type SP = Record<string, string | string[] | undefined>;
const fmtDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(iso));

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const range = [7, 30, 90].includes(Number(sp.range)) ? Number(sp.range) : 7;
  const m = await getDashboardMetrics(range);

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Performance over the selected period." actions={<DateRange />} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatMoney(m.kpis.revenue.value, m.currency)} delta={m.kpis.revenue.delta} />
        <StatCard label="Orders" value={String(m.kpis.orders.value)} delta={m.kpis.orders.delta} />
        <StatCard label="Avg. order value" value={formatMoney(m.kpis.aov.value, m.currency)} delta={m.kpis.aov.delta} />
        <StatCard label="Repeat-customer rate" value={`${m.kpis.repeatRate.value}%`} delta={m.kpis.repeatRate.delta} />
      </div>

      <Card>
        <h2 className="mb-4 font-medium">Revenue — last {range} days</h2>
        <RevenueChart data={m.revenueSeries} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-medium">Revenue by category</h2>
          <CategoryBreakdown data={m.categoryBreakdown} currency={m.currency} />
        </Card>
        <Card>
          <h2 className="mb-4 font-medium">Recent orders</h2>
          {m.recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" hint="New orders will show up here." />
          ) : (
            <ul className="divide-y divide-line text-sm">
              {m.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2.5">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium text-accent hover:underline">{o.order_number}</Link>
                  <span className="flex items-center gap-3">
                    <StatusBadge status={o.status as OrderStatus} />
                    <span className="text-ink-soft">{fmtDate(o.created_at)}</span>
                    <span className="w-20 text-right">{formatMoney(o.total_minor, o.currency)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-medium">Low stock</h2>
          {m.low.length === 0 ? <p className="text-sm text-ink-soft">All good — nothing low.</p> : (
            <ul className="space-y-2 text-sm">
              {m.low.map((r) => {
                const variant = r.variant as unknown as { sku: string; name: string | null; product: { name: string } | null } | null;
                return (
                  <li key={r.variant_id} className="flex justify-between">
                    <span>{variant?.product?.name ?? variant?.sku}</span>
                    <span className="font-medium text-gold">{r.on_hand - r.reserved} left</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-4 font-medium">Top products</h2>
          {m.topProducts.length === 0 ? <EmptyState title="No sales yet" hint="Top sellers appear here once orders come in." /> : (
            <ul className="space-y-2 text-sm">
              {m.topProducts.map((p) => <li key={p.name} className="flex justify-between"><span>{p.name}</span><span className="text-ink-soft">{p.qty} sold</span></li>)}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
