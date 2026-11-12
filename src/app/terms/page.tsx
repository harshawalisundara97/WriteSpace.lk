import type { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/store/content-page";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms and conditions for using WriteSpace.lk and placing orders.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <ContentPage
      title="Terms of service"
      intro="The terms and conditions for using WriteSpace.lk and placing orders."
      updated="12 November 2026"
    >
      <ContentSection heading="Acceptance of terms">
        <p>
          By accessing or using WriteSpace.lk and placing an order, you agree to these terms. If you
          do not agree, please do not use the site.
        </p>
      </ContentSection>

      <ContentSection heading="Products & pricing">
        <p>
          All prices are shown in Sri Lankan Rupees (LKR) and include applicable taxes unless stated
          otherwise. We try to keep product descriptions, images and prices accurate, but errors may
          occur. If we discover an error in the price of an item you have ordered, we will contact you
          before dispatch. Product colours may vary slightly from on-screen images.
        </p>
      </ContentSection>

      <ContentSection heading="Orders">
        <p>
          Your order is an offer to buy. We confirm receipt by email, and a contract is formed when we
          dispatch your order. We may refuse or cancel an order — for example if an item is out of
          stock or we suspect fraud — and will refund any payment taken.
        </p>
      </ContentSection>

      <ContentSection heading="Payment">
        <p>
          Payment is taken securely through our payment provider at checkout. You confirm that you are
          authorised to use the payment method provided.
        </p>
      </ContentSection>

      <ContentSection heading="Delivery, returns & refunds">
        <p>
          Delivery is governed by our <a href="/shipping">shipping policy</a>, and returns and
          refunds by our <a href="/returns">returns &amp; refunds policy</a>, both of which form part
          of these terms.
        </p>
      </ContentSection>

      <ContentSection heading="Accounts">
        <p>
          You are responsible for keeping your account credentials secure and for all activity under
          your account. Please notify us of any unauthorised use.
        </p>
      </ContentSection>

      <ContentSection heading="Acceptable use">
        <p>
          You agree not to misuse the site, attempt to disrupt it, or use it for unlawful purposes.
          All site content, branding and design are owned by WriteSpace.lk and may not be reused
          without permission.
        </p>
      </ContentSection>

      <ContentSection heading="Limitation of liability">
        <p>
          To the extent permitted by law, WriteSpace.lk is not liable for indirect or consequential
          losses arising from the use of the site or products. Nothing in these terms limits rights
          you have under applicable consumer law.
        </p>
      </ContentSection>

      <ContentSection heading="Changes to these terms">
        <p>
          We may update these terms from time to time. The version published on this page at the time
          of your order applies to that order.
        </p>
      </ContentSection>

      <ContentSection heading="Contact">
        <p>
          Questions about these terms? Contact us using the details in the site footer. See also our{" "}
          <a href="/privacy">privacy policy</a>.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
