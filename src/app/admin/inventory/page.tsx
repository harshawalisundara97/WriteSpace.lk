import { getAdminInventory } from "@/lib/admin/inventory";
import { InventoryTable } from "@/components/admin/inventory-table";
import { PageHeader } from "@/components/admin/ui";

export default async function AdminInventoryPage() {
  const rows = await getAdminInventory();
  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description="Stock on hand across every variant. Edit a value and save to adjust." />
      <InventoryTable rows={rows} />
    </div>
  );
}
