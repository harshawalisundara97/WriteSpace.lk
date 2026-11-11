import Link from "next/link";
import { getMyOrders } from "@/lib/account/queries";
import { StatusBadge } from "@/components/store/status-badge";
import { formatMoney } from "@/lib/pricing/money";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/lib/types";

export const metadata = { title: "My orders" };
const fmtDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));

export default async function MyOrdersPage() {
  const orders = await getMyOrders();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">My orders</h1>
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center text-ink-soft">
          <p>You haven’t placed any orders yet.</p>
          <Link href="/products"><Button className="mt-4">Start shopping</Button></Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-paper-2 text-left text-ink-soft">
              <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th><th /></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-line">
                  <td className="px-4 py-3 font-medium">{o.order_number}</td>
                  <td className="px-4 py-3 text-ink-soft">{fmtDate(o.created_at)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status as OrderStatus} /></td>
                  <td className="px-4 py-3 text-right">{formatMoney(o.total_minor, o.currency)}</td>
                  <td className="px-4 py-3 text-right"><Link href={`/account/orders/${o.id}`} className="text-accent hover:underline">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
