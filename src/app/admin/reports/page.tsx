import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { requireAdmin, can } from "@/lib/auth/guards";
import { getSalesReport } from "@/lib/admin/report-queries";
import { parseDateWindow, type ReportType } from "@/lib/admin/reports";
import { PageHeader, Card, StatCard, EmptyState } from "@/components/admin/ui";
import { formatMoney } from "@/lib/pricing/money";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function ExportLink({ href }: { href: string }) {
  return (
    <a href={href} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs hover:bg-paper-2">
      <Download className="h-3.5 w-3.5" /> CSV
    </a>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireAdmin();
  if (!can(ctx, "orders:write")) redirect("/admin");
  const sp = await searchParams;
  const w = parseDateWindow(one(sp.from), one(sp.to));
  const r = await getSalesReport(w);
  const money = (n: number) => formatMoney(n, r.currency);
  const exportHref = (t: ReportType) => `/api/admin/reports/export?type=${t}&from=${w.from}&to=${w.to}`;
  const s = r.summary;
  const activeDays = r.daily.filter((d) => d.orders > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports"
        description={`Paid orders from ${w.from} to ${w.to} (UTC).`}
        actions={
          <form method="get" className="flex flex-wrap items-end gap-2 text-sm">
            <label className="flex flex-col gap-1"><span className="text-xs text-ink-soft">From</span>
              <input type="date" name="from" defaultValue={w.from} className="rounded-lg border border-line bg-paper px-2 py-1.5" /></label>
            <label className="flex flex-col gap-1"><span className="text-xs text-ink-soft">To</span>
              <input type="date" name="to" defaultValue={w.to} className="rounded-lg border border-line bg-paper px-2 py-1.5" /></label>
            <button type="submit" className="rounded-full bg-brand px-4 py-2 text-paper">Apply</button>
          </form>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Net sales" value={money(s.net_minor)} />
        <StatCard label="Orders" value={String(s.orders)} />
        <StatCard label="Avg. order value" value={money(s.aov_minor)} />
        <StatCard label="Tax collected" value={money(s.tax_minor)} />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between"><h2 className="font-medium">Sales by day</h2><ExportLink href={exportHref("sales")} /></div>
        {activeDays.length === 0 ? <EmptyState title="No paid orders in this range" hint="Try a wider date range." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-ink-soft"><tr>
                <th className="py-2">Date</th><th className="text-right">Orders</th><th className="text-right">Gross</th>
                <th className="text-right">Discount</th><th className="text-right">Shipping</th><th className="text-right">Tax</th><th className="text-right">Net</th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {activeDays.map((d) => (
                  <tr key={d.date}>
                    <td className="py-2">{d.date}</td><td className="text-right">{d.orders}</td><td className="text-right">{money(d.gross_minor)}</td>
                    <td className="text-right">−{money(d.discount_minor)}</td><td className="text-right">{money(d.shipping_minor)}</td>
                    <td className="text-right">{money(d.tax_minor)}</td><td className="text-right font-medium">{money(d.net_minor)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-line font-medium"><tr>
                <td className="py-2">Total</td><td className="text-right">{s.orders}</td><td className="text-right">{money(s.gross_minor)}</td>
                <td className="text-right">−{money(s.discount_minor)}</td><td className="text-right">{money(s.shipping_minor)}</td>
                <td className="text-right">{money(s.tax_minor)}</td><td className="text-right">{money(s.net_minor)}</td>
              </tr></tfoot>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between"><h2 className="font-medium">Tax summary</h2><ExportLink href={exportHref("tax")} /></div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">Taxable sales (after discounts)</dt><dd>{money(s.gross_minor - s.discount_minor)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">Tax collected</dt><dd className="font-medium">{money(s.tax_minor)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">Shipping (excluded)</dt><dd>{money(s.shipping_minor)}</dd></div>
          </dl>
        </Card>
        <Card>
          <div className="mb-4 flex items-center justify-between"><h2 className="font-medium">Products ({s.units} units)</h2><ExportLink href={exportHref("products")} /></div>
          {r.products.length === 0 ? <EmptyState title="No product sales" /> : (
            <ul className="divide-y divide-line text-sm">
              {r.products.slice(0, 15).map((p) => (
                <li key={p.sku} className="flex justify-between gap-3 py-2">
                  <span className="truncate">{p.product_name} <span className="text-ink-soft">· {p.sku}</span></span>
                  <span className="shrink-0 text-ink-soft">{p.quantity} × · <span className="text-ink">{money(p.revenue_minor)}</span></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
