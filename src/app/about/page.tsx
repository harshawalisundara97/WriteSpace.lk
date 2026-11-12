import type { Metadata } from "next";
import { ContentPage, ContentSection, ContentList } from "@/components/store/content-page";

export const metadata: Metadata = {
  title: "About us",
  description:
    "WriteSpace.lk is a Sri Lankan stationery store — pens, paper, art supplies and desk goods for students, creatives and offices, delivered island-wide.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <ContentPage
      title="About WriteSpace.lk"
      intro="Stationery for kids and grown-ups — thoughtfully chosen, fairly priced and delivered across Sri Lanka."
    >
      <ContentSection heading="Who we are">
        <p>
          WriteSpace.lk is a Sri Lankan stationery store built for people who love a good pen and a
          fresh page. From a child&apos;s first colouring set to a designer&apos;s sketchbook and the
          everyday supplies that keep an office running, we curate dependable, well-made stationery
          and ship it island-wide from our Colombo fulfilment centre.
        </p>
      </ContentSection>

      <ContentSection heading="What we stand for">
        <ContentList
          items={[
            <>
              <strong>Quality you can trust:</strong> we stock brands and products we would happily
              use ourselves, and stand behind every order.
            </>,
            <>
              <strong>Fair, transparent pricing:</strong> prices are shown in LKR with no hidden
              charges — delivery is calculated clearly at checkout.
            </>,
            <>
              <strong>Everyone&apos;s desk:</strong> a range that spans the Kids&apos; Corner, art and
              craft, writing essentials and office &amp; desk goods.
            </>,
            <>
              <strong>Service that follows through:</strong> real people, quick replies and a
              no-fuss returns policy when something isn&apos;t right.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection heading="Delivered across Sri Lanka">
        <p>
          We deliver to all 25 districts through trusted local courier partners, with tracking on
          every parcel. Most orders placed before 2:00 PM on a working day are dispatched the same
          day. See our <a href="/shipping">shipping policy</a> for timeframes and charges.
        </p>
      </ContentSection>

      <ContentSection heading="Browse &amp; get in touch">
        <p>
          Ready to stock up? Explore <a href="/products">all products</a> or the{" "}
          <a href="/c/kids-corner">Kids&apos; Corner</a>, and keep an eye on{" "}
          <a href="/promotions">promotions</a> for current offers. Questions about an order or a
          product? Our contact details are in the footer on every page, and we&apos;re always happy
          to help.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
