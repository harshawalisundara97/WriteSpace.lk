import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="ws-container grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <p className="font-display text-7xl font-semibold text-brand/20">404</p>
        <h1 className="mt-2 font-display text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-ink-soft">The page you’re looking for doesn’t exist or has moved.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/"><Button variant="outline">Go home</Button></Link>
          <Link href="/products"><Button>Browse products</Button></Link>
        </div>
      </div>
    </div>
  );
}
