import Link from "next/link";
import { getAdminRefunds } from "@/lib/admin/queries";
import { PageHeader, StatCard, Badge, EmptyState } from "@/components/admin/ui";
import { formatMoney } from "@/lib/pricing/money";

export const dynamic = "force-dynamic";

const fmt = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "succeeded") return "success";
  if (status === "pending") return "warning";
  if (status === "failed") return "danger";
  return "neutral";
}

export default async function AdminRefundsPage() {
  const refunds = await getAdminRefunds();
  const currency = refunds[0]?.currency ?? "LKR";
  const succeeded = refunds.filter((r) => r.status === "succeeded");
  const totalRefunded = succeeded.reduce((s, r) => s + r.amount_minor, 0);
  const restockedCount = refunds.filter((r) => r.restocked).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Refunds" description="Every refund issued against an order, newest first. Issue new refunds from an order's detail page." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total refunded" value={formatMoney(totalRefunded, currency)} />
        <StatCard label="Refunds issued" value={String(refunds.length)} />
        <StatCard label="With restock" value={String(restockedCount)} />
      </div>

      {refunds.length === 0 ? (
        <EmptyState title="No refunds yet" hint="Refunds issued from an order appear here with a full audit trail." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-paper-2 text-left text-ink-soft">
              <tr>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Order</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Reason</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((r) => (
                <tr key={r.id} className="border-t border-line align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{fmt(r.created_at)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link href={`/admin/orders/${r.order_id}`} className="font-mono text-xs hover:text-accent">{r.order_number}</Link>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{r.email}</td>
                  <td className="max-w-xs px-4 py-3 text-ink-soft">{r.reason ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                      {r.restocked && <Badge tone="neutral">restocked</Badge>}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{formatMoney(r.amount_minor, r.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
