import Link from "next/link";
import { CheckoutClient } from "@/components/checkout/checkout-client";
import { getCartSummary } from "@/lib/cart/summary";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const summary = await getCartSummary();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;

  if (summary.lines.length === 0) {
    return (
      <div className="ws-container grid min-h-[50vh] place-items-center py-16 text-center">
        <div>
          <h1 className="font-display text-2xl font-semibold">Your cart is empty</h1>
          <p className="mt-2 text-ink-soft">Add a few things before checking out.</p>
          <Link href="/products"><Button className="mt-5">Browse products</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-container py-10">
      <h1 className="mb-8 font-display text-3xl font-semibold">Checkout</h1>
      <CheckoutClient
        lines={summary.lines}
        totals={summary.totals}
        currency={summary.currency}
        publishableKey={pk}
        siteUrl={siteUrl}
      />
    </div>
  );
}
