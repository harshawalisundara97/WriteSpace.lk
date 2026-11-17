import type { Metadata } from "next";
import { UnsubscribeForm } from "@/components/store/unsubscribe-form";
import { unsubscribeSecret, verifyUnsubscribeToken } from "@/lib/cart/abandoned";

export const metadata: Metadata = { title: "Email preferences", robots: { index: false } };

type SP = Record<string, string | string[] | undefined>;

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const c = typeof sp.c === "string" ? sp.c : "";
  const t = typeof sp.t === "string" ? sp.t : "";
  const valid = verifyUnsubscribeToken(c, t, unsubscribeSecret());
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-display text-3xl font-semibold">Cart reminders</h1>
      {valid ? (
        <>
          <p className="mt-3 text-ink-soft">We send one email when you leave items in your cart. Order emails are not affected.</p>
          <UnsubscribeForm customerId={c} token={t} />
        </>
      ) : (
        <p className="mt-3 text-ink-soft">This unsubscribe link is invalid or has expired. Contact us and we&apos;ll update your preferences.</p>
      )}
    </div>
  );
}
