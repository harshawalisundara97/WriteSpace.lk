import { CardGridSkeleton, FiltersSkeleton } from "@/components/store/skeletons";

export default function Loading() {
  return (
    <div className="ws-container py-10">
      <div className="mb-8 space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-paper-2" />
        <div className="h-9 w-56 animate-pulse rounded-lg bg-paper-2" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <FiltersSkeleton />
        <CardGridSkeleton />
      </div>
    </div>
  );
}
