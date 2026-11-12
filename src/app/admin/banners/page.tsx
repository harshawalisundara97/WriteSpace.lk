import { getAdminBanners } from "@/lib/admin/catalog-queries";
import { BannersManager } from "@/components/admin/banners-manager";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  const banners = await getAdminBanners();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Banners & content"
        description="Manage homepage hero slides, promo strips, and category banners shown across the storefront."
      />
      <BannersManager banners={banners} />
    </div>
  );
}
