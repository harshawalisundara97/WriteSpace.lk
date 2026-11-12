import type { Metadata } from "next";
import { ContentPage, ContentSection, ContentList } from "@/components/store/content-page";

export const metadata: Metadata = {
  title: "Returns & refunds",
  description: "How to return items and get a refund or exchange at WriteSpace.lk, including timeframes and conditions.",
  alternates: { canonical: "/returns" },
};

export default function ReturnsPage() {
  return (
    <ContentPage
      title="Returns & refunds"
      intro="Not quite right? Here's how returns, exchanges and refunds work."
      updated="12 November 2026"
    >
      <ContentSection heading="Our promise">
        <p>
          We want you to be happy with every order. If something isn&apos;t right, you may return
          most items within <strong>14 days</strong> of delivery for a refund or exchange, subject to
          the conditions below.
        </p>
      </ContentSection>

      <ContentSection heading="Return conditions">
        <ContentList
          items={[
            "Items must be unused, in their original condition and packaging.",
            "Proof of purchase (order number or confirmation email) is required.",
            "Opened ink, paint or glue, and used writing instruments cannot be returned for hygiene and safety reasons unless faulty.",
            "Personalised, custom-cut or clearance items are final sale unless faulty.",
          ]}
        />
      </ContentSection>

      <ContentSection heading="Damaged, faulty or incorrect items">
        <p>
          If your order arrives damaged, faulty or incorrect, contact us within{" "}
          <strong>7 days</strong> of delivery with your order number and a photo of the item. We will
          arrange a free replacement or a full refund, including delivery charges.
        </p>
      </ContentSection>

      <ContentSection heading="How to start a return">
        <ContentList
          items={[
            <>Contact our support team with your order number (see your <a href="/account/orders">order history</a> or confirmation email).</>,
            "We'll confirm the return and share the return address or arrange a pickup where available.",
            "Pack the item securely and include your order number inside the parcel.",
          ]}
        />
      </ContentSection>

      <ContentSection heading="Refunds">
        <p>
          Once we receive and inspect your return, we&apos;ll process your refund to the original
          payment method within <strong>5–7 working days</strong>. Your bank or card provider may take
          additional time to reflect the amount. Original delivery charges are non-refundable except
          where the item was faulty, damaged or incorrect.
        </p>
      </ContentSection>

      <ContentSection heading="Return shipping">
        <p>
          For change-of-mind returns, the cost of return shipping is the customer&apos;s
          responsibility. For faulty, damaged or incorrect items, we cover return shipping.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
