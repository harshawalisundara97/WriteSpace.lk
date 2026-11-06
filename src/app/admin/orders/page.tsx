import Link from "next/link";
import { getAdminOrders } from "@/lib/admin/queries";
import { StatusBadge } from "@/components/store/status-badge";
import { formatMoney } from "@/lib/pricing/money";

type SP = Record<string, string | string[] | undefined>;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const orders = await getAdminOrders({ status, q });

  const statuses = ["pending_payment", "paid", "fulfilled", "shipped", "delivered", "cancelled", "refunded"];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Orders</h1>

      <form className="flex flex-wrap gap-2" action="/admin/orders">
        <input name="q" defaultValue={q} placeholder="Search order # or email"
          className="h-10 w-64 rounded-xl border border-line bg-paper px-3 text-sm outline-none" />
        <select name="status" defaultValue={status ?? ""} className="h-10 rounded-xl border border-line bg-paper px-3 text-sm">
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <button className="h-10 rounded-xl bg-brand px-4 text-sm text-paper">Filter</button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-paper-2 text-left text-ink-soft">
            <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th></tr>
          </thead>
          <tbody>
            {orders.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-soft">No orders.</td></tr>}
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-line hover:bg-paper-2/50">
                <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-medium text-accent hover:underline">{o.order_number}</Link></td>
                <td className="px-4 py-3 text-ink-soft">{o.email}</td>
                <td className="px-4 py-3 text-ink-soft">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-right">{formatMoney(o.total_minor, o.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
