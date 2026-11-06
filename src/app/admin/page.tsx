import Link from "next/link";
import { getDashboardMetrics } from "@/lib/admin/queries";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { PageHeader, Card, StatCard, EmptyState } from "@/components/admin/ui";
import { formatMoney } from "@/lib/pricing/money";

export default async function AdminDashboard() {
  const m = await getDashboardMetrics();
  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="An overview of your store’s performance." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue (paid)" value={formatMoney(m.revenue, m.currency)} />
        <StatCard label="Orders today" value={String(m.ordersToday)} />
        <StatCard label="Orders (7 days)" value={String(m.ordersWeek)} />
        <StatCard label="Avg. order value" value={formatMoney(m.aov, m.currency)} />
      </div>

      <Card>
        <h2 className="mb-4 font-medium">Revenue — last 7 days</h2>
        <RevenueChart data={m.revenueSeries} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-medium">Low stock</h2>
          {m.low.length === 0 ? (
            <p className="text-sm text-ink-soft">All good — nothing low.</p>
          ) : (
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
          {m.topProducts.length === 0 ? (
            <EmptyState title="No sales yet" hint="Top sellers will appear here once orders come in." />
          ) : (
            <ul className="space-y-2 text-sm">
              {m.topProducts.map((p) => (
                <li key={p.name} className="flex justify-between"><span>{p.name}</span><span className="text-ink-soft">{p.qty} sold</span></li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Link href="/admin/orders" className="inline-block text-sm text-accent hover:underline">Manage orders →</Link>
    </div>
  );
}
