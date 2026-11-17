import Link from "next/link";
import { getCartLines } from "@/lib/cart/actions";
import { getCurrentUser } from "@/lib/auth/user";
import { getStoreSettings } from "@/lib/catalog/queries";
import { QuoteRequestForm } from "@/components/store/quote-request";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Request a bulk quote",
  description: "Buying for an office or school? Send us your list and we'll reply with bulk prices within one working day.",
  robots: { index: false },
};

export default async function QuotePage() {
  const [lines, user, settings] = await Promise.all([getCartLines(), getCurrentUser(), getStoreSettings()]);
  return (
    <div className="ws-container max-w-4xl py-10">
      <h1 className="font-display text-3xl font-semibold">Request a bulk quote</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Buying for an office, school or event? Set the quantities you need — even beyond what&apos;s in stock — and we&apos;ll reply with
        prices within one working day. Your cart stays as it is.
      </p>
      {lines.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line p-8 text-center text-ink-soft">
          <p>Your cart is empty. Add the items you need, then come back here.</p>
          <Link href="/products"><Button className="mt-4">Browse products</Button></Link>
        </div>
      ) : (
        <QuoteRequestForm
          lines={lines.map((l) => ({
            variant_id: l.variant_id, name: l.variant_name ? `${l.product_name} — ${l.variant_name}` : l.product_name,
            sku: l.sku, unit_price_minor: l.unit_price_minor, quantity: l.quantity,
          }))}
          currency={settings.currency}
          defaults={{ contact_name: user?.full_name ?? "", email: user?.email ?? "" }}
        />
      )}
    </div>
  );
}
