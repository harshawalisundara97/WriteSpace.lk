export default function Loading() {
  return (
    <div className="ws-container py-10">
      <div className="mb-6 h-4 w-40 animate-pulse rounded bg-paper-2" />
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="aspect-square animate-pulse rounded-2xl bg-paper-2" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-xl bg-paper-2" />)}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-4 w-24 animate-pulse rounded bg-paper-2" />
          <div className="h-10 w-3/4 animate-pulse rounded-lg bg-paper-2" />
          <div className="h-5 w-full animate-pulse rounded bg-paper-2" />
          <div className="h-5 w-2/3 animate-pulse rounded bg-paper-2" />
          <div className="mt-4 h-9 w-40 animate-pulse rounded bg-paper-2" />
          <div className="h-12 w-full animate-pulse rounded-full bg-paper-2" />
        </div>
      </div>
    </div>
  );
}
