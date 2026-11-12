import type { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/store/content-page";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to common questions about WriteSpace.lk — ordering, stationery products, GSM and paper sizes, delivery across Sri Lanka, payments, returns and bulk/school orders.",
  alternates: { canonical: "/faq" },
};

type QA = { q: string; a: React.ReactNode };

function FaqList({ items }: { items: QA[] }) {
  return (
    <dl className="space-y-5">
      {items.map((item, i) => (
        <div key={i} className="space-y-1.5">
          <dt className="font-medium text-ink">{item.q}</dt>
          <dd className="text-sm leading-relaxed text-ink-soft">{item.a}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function FaqPage() {
  return (
    <ContentPage
      title="Frequently asked questions"
      intro="Quick answers about our stationery, ordering, delivery and more. Can't find what you need? Head to our contact page."
      updated="12 November 2026"
    >
      <ContentSection heading="Orders & payment">
        <FaqList
          items={[
            {
              q: "Do I need an account to order?",
              a: (
                <>
                  No — you can check out as a guest. Creating an{" "}
                  <a href="/register">account</a> lets you track orders, save a wishlist and
                  reorder faster.
                </>
              ),
            },
            {
              q: "What payment methods do you accept?",
              a: "We accept major credit and debit cards through our secure checkout. All prices are shown in Sri Lankan Rupees (LKR).",
            },
            {
              q: "Can I change or cancel my order after placing it?",
              a: (
                <>
                  If your order hasn&apos;t shipped yet, contact us as soon as possible via the{" "}
                  <a href="/contact">contact page</a> and we&apos;ll do our best to amend or cancel it.
                </>
              ),
            },
            {
              q: "How do I track my order?",
              a: (
                <>
                  Sign in and open your <a href="/account/orders">order history</a>, or use the link
                  in your confirmation email to see the latest status.
                </>
              ),
            },
          ]}
        />
      </ContentSection>

      <ContentSection heading="Stationery products">
        <FaqList
          items={[
            {
              q: "What does GSM mean on paper and notebooks?",
              a: "GSM (grams per square metre) measures paper weight and thickness. Everyday notebook and copier paper is usually 70–90 GSM; sketch and marker paper runs heavier (120 GSM and up) to reduce bleed-through. Each product lists its GSM where relevant.",
            },
            {
              q: "What paper sizes do you stock?",
              a: "We carry common sizes including A6, A5, A4 and A3, plus exercise-book and legal formats. The size is shown on each product page so you can match it to your printer, binder or school requirement.",
            },
            {
              q: "What does the ruling (single / wide / square / dotted) mean?",
              a: "Ruling is the line pattern printed on the page: single and wide ruled for writing, squared/graph for maths and diagrams, and dotted for bullet journaling and lettering. Plain (unruled) is best for sketching.",
            },
            {
              q: "Are your pens and art supplies refillable?",
              a: (
                <>
                  Many of our pens, mechanical pencils and markers take standard refills — check the
                  product description for refill compatibility, or browse the{" "}
                  <a href="/products">full range</a> for matching refills.
                </>
              ),
            },
            {
              q: "Do product colours match exactly what I see on screen?",
              a: "We photograph products as accurately as we can, but screen settings can vary slightly. If a colour is critical, contact us before ordering and we'll help.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection heading="Delivery">
        <FaqList
          items={[
            {
              q: "Where do you deliver?",
              a: "We deliver island-wide across Sri Lanka. Delivery times and charges depend on your location and are shown at checkout.",
            },
            {
              q: "How long does delivery take?",
              a: (
                <>
                  Most orders arrive within a few working days. See our{" "}
                  <a href="/shipping">shipping page</a> for current timeframes and charges.
                </>
              ),
            },
            {
              q: "Do you offer bulk or school delivery?",
              a: (
                <>
                  Yes — for schools, offices and large orders, get in touch through the{" "}
                  <a href="/contact">contact page</a> and we&apos;ll arrange pricing and delivery to
                  suit you.
                </>
              ),
            },
          ]}
        />
      </ContentSection>

      <ContentSection heading="Returns & support">
        <FaqList
          items={[
            {
              q: "What is your returns policy?",
              a: (
                <>
                  Most items can be returned within 14 days of delivery, subject to conditions. See
                  our <a href="/returns">returns &amp; refunds page</a> for the full details.
                </>
              ),
            },
            {
              q: "My item arrived damaged or faulty — what do I do?",
              a: (
                <>
                  Contact us within 7 days of delivery with your order number and a photo, and
                  we&apos;ll arrange a free replacement or full refund. See{" "}
                  <a href="/returns">returns &amp; refunds</a>.
                </>
              ),
            },
            {
              q: "How can I get in touch?",
              a: (
                <>
                  Use our <a href="/contact">contact page</a> to send an enquiry, or reach us by
                  email, phone or WhatsApp using the details in the footer.
                </>
              ),
            },
          ]}
        />
      </ContentSection>
    </ContentPage>
  );
}
