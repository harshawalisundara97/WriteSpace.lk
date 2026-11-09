export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div className="aspect-[4/5] animate-pulse rounded-2xl bg-paper-2" />
          <div className="mt-3 h-3 w-1/3 animate-pulse rounded bg-paper-2" />
          <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-paper-2" />
          <div className="mt-2 h-4 w-1/4 animate-pulse rounded bg-paper-2" />
        </div>
      ))}
    </div>
  );
}

export function FiltersSkeleton() {
  return (
    <div className="hidden space-y-6 lg:block">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-20 animate-pulse rounded bg-paper-2" />
          <div className="h-9 w-full animate-pulse rounded-xl bg-paper-2" />
        </div>
      ))}
    </div>
  );
}
