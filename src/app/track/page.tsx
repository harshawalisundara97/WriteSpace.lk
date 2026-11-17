import type { Metadata } from "next";
import { localeAlternates } from "@/lib/i18n/seo-server";
import { TrackOrderClient } from "@/components/store/track-order";

const META: Metadata = {
  title: "Track your order",
  description: "Check the status of your WriteSpace.lk order with your order number and the email or phone used at checkout.",
};

export async function generateMetadata(): Promise<Metadata> {
  return { ...META, alternates: await localeAlternates("/track") };
}

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return (
    <div className="ws-container py-12">
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Track your order</h1>
        <p className="mt-3 text-base text-ink-soft">
          Enter your order number (from your confirmation email) and the email or phone number you used at checkout.
        </p>
        <TrackOrderClient initialOrderNumber={order?.slice(0, 40) ?? ""} />
      </div>
    </div>
  );
}
