import { getAdminCustomers } from "@/lib/admin/customer-queries";
import { CustomersTable, type CustomerRow } from "@/components/admin/customers-table";
import { PageHeader } from "@/components/admin/ui";

export default async function AdminCustomersPage() {
  const customers = await getAdminCustomers();
  const rows: CustomerRow[] = customers.map((c) => ({
    id: c.id, name: c.full_name ?? "", email: c.email, orders: c.orders, spent: c.spent, is_blocked: c.is_blocked,
  }));
  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description="Everyone who has an account with your store." />
      <CustomersTable rows={rows} />
    </div>
  );
}
