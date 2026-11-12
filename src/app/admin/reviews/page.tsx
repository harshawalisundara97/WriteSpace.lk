import { getAdminReviews } from "@/lib/admin/catalog-queries";
import { ReviewsModeration } from "@/components/admin/reviews-moderation";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const reviews = await getAdminReviews();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews"
        description="Approve, hide, or remove customer product reviews. New reviews stay hidden until approved."
      />
      <ReviewsModeration reviews={reviews} />
    </div>
  );
}
