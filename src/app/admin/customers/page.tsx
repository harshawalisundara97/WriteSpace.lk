import Link from "next/link";
import { getAdminCustomers } from "@/lib/admin/customer-queries";
import { formatMoney } from "@/lib/pricing/money";

export default async function AdminCustomersPage() {
  const customers = await getAdminCustomers();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Customers</h1>
      <div className="overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-paper-2 text-left text-ink-soft">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Orders</th><th className="px-4 py-3">Spent</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody>
            {customers.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-soft">No customers yet.</td></tr>}
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-line hover:bg-paper-2/50">
                <td className="px-4 py-3"><Link href={`/admin/customers/${c.id}`} className="font-medium text-accent hover:underline">{c.full_name ?? "—"}</Link></td>
                <td className="px-4 py-3 text-ink-soft">{c.email}</td>
                <td className="px-4 py-3">{c.orders}</td>
                <td className="px-4 py-3">{formatMoney(c.spent)}</td>
                <td className="px-4 py-3">{c.is_blocked ? <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs text-accent">Blocked</span> : <span className="text-ink-soft">Active</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
