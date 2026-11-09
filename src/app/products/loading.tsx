import { CardGridSkeleton, FiltersSkeleton } from "@/components/store/skeletons";

export default function Loading() {
  return (
    <div className="ws-container py-10">
      <div className="mb-8 h-9 w-48 animate-pulse rounded-lg bg-paper-2" />
      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <FiltersSkeleton />
        <CardGridSkeleton />
      </div>
    </div>
  );
}
