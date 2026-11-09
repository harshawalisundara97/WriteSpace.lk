"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="ws-container grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <p className="font-display text-7xl font-semibold text-accent/25">!</p>
        <h1 className="mt-2 font-display text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-ink-soft">An unexpected error occurred. Please try again.</p>
        <Button className="mt-6" onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
