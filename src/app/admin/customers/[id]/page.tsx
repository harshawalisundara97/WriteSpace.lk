import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminCustomer } from "@/lib/admin/customer-queries";
import { BlockButton } from "@/components/admin/block-button";
import { StatusBadge } from "@/components/store/status-badge";
import { formatMoney } from "@/lib/pricing/money";

export default async function AdminCustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAdminCustomer(id);
  if (!data) notFound();
  const { customer, orders } = data;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">{customer.full_name ?? customer.email}</h1>
          <p className="mt-1 text-sm text-ink-soft">{customer.email}{customer.phone ? ` · ${customer.phone}` : ""}</p>
        </div>
        <BlockButton customerId={customer.id} blocked={customer.is_blocked} />
      </div>
      <div className="overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-paper-2 text-left text-ink-soft"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th></tr></thead>
          <tbody>
            {orders.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-soft">No orders.</td></tr>}
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-line">
                <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="text-accent hover:underline">{o.order_number}</Link></td>
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
