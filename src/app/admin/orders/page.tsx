import { getAdminOrders } from "@/lib/admin/queries";
import { OrdersTable } from "@/components/admin/orders-table";
import { PageHeader } from "@/components/admin/ui";

type SP = Record<string, string | string[] | undefined>;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const orders = await getAdminOrders({ status, q });
  const statuses = ["pending_payment", "paid", "fulfilled", "shipped", "delivered", "cancelled", "refunded"];

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description="Search, filter, and manage every order." />

      <form className="flex flex-wrap gap-2" action="/admin/orders">
        <input name="q" defaultValue={q} placeholder="Search order # or email" className="h-10 w-64 rounded-xl border border-line bg-paper px-3 text-sm outline-none" />
        <select name="status" defaultValue={status ?? ""} className="h-10 rounded-xl border border-line bg-paper px-3 text-sm">
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <button className="h-10 rounded-xl bg-brand px-4 text-sm text-paper">Filter</button>
      </form>

      <OrdersTable rows={orders} />
    </div>
  );
}
