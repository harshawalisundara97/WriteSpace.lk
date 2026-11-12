import type { Metadata } from "next";
import { ContentPage, ContentSection, ContentList } from "@/components/store/content-page";

export const metadata: Metadata = {
  title: "Shipping policy",
  description: "Delivery areas, timeframes, charges and dispatch details for WriteSpace.lk orders across Sri Lanka.",
  alternates: { canonical: "/shipping" },
};

export default function ShippingPage() {
  return (
    <ContentPage
      title="Shipping policy"
      intro="How and when we deliver your stationery across Sri Lanka."
      updated="12 November 2026"
    >
      <ContentSection heading="Where we deliver">
        <p>
          We deliver island-wide across all 25 districts of Sri Lanka. Orders are shipped from our
          Colombo fulfilment centre via trusted local courier partners.
        </p>
      </ContentSection>

      <ContentSection heading="Delivery timeframes">
        <ContentList
          items={[
            <><strong>Colombo & suburbs:</strong> 1–2 working days.</>,
            <><strong>Other major towns:</strong> 2–4 working days.</>,
            <><strong>Remote areas:</strong> 3–6 working days.</>,
          ]}
        />
        <p>
          Timeframes are estimates from the point of dispatch and exclude Sundays and public
          holidays. Bulk and school-pack orders may need an extra day to pick and pack.
        </p>
      </ContentSection>

      <ContentSection heading="Dispatch & processing">
        <p>
          Orders placed before 2:00 PM on a working day are usually processed the same day. Orders
          placed after that, or on weekends and holidays, are processed on the next working day.
          You will receive an order confirmation email, followed by a dispatch email with a tracking
          number once your parcel is on its way.
        </p>
      </ContentSection>

      <ContentSection heading="Delivery charges">
        <p>
          Delivery is charged at checkout based on your location and order weight. Qualifying orders
          may receive free delivery — any active free-shipping offer is shown on the{" "}
          <a href="/promotions">promotions</a> page and applied automatically in the cart.
        </p>
      </ContentSection>

      <ContentSection heading="Tracking your order">
        <p>
          Signed-in customers can follow every order from{" "}
          <a href="/account/orders">My orders</a>, including its current status and courier tracking
          number. If you checked out as a guest, use the tracking link in your dispatch email.
        </p>
      </ContentSection>

      <ContentSection heading="Problems with delivery">
        <p>
          If your order has not arrived within the expected timeframe, or arrives damaged, contact
          us within 7 days of dispatch and we will make it right. See our{" "}
          <a href="/returns">returns &amp; refunds policy</a> for damaged or incorrect items.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
