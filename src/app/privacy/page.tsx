import type { Metadata } from "next";
import { ContentPage, ContentSection, ContentList } from "@/components/store/content-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How WriteSpace.lk collects, uses and protects your personal information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <ContentPage
      title="Privacy policy"
      intro="How we collect, use and protect your personal information."
      updated="12 November 2026"
    >
      <ContentSection heading="Information we collect">
        <p>We collect the information you give us and some information collected automatically:</p>
        <ContentList
          items={[
            <><strong>Account & order details:</strong> name, email, phone number, delivery address and order history.</>,
            <><strong>Payment information:</strong> processed securely by our payment provider — we do not store your full card details.</>,
            <><strong>Usage data:</strong> basic device and browsing information to keep the site working and improve it.</>,
          ]}
        />
      </ContentSection>

      <ContentSection heading="How we use your information">
        <ContentList
          items={[
            "To process and deliver your orders and send order confirmations and updates.",
            "To provide customer support and respond to your enquiries.",
            "To send marketing or promotional messages where you have opted in (you can unsubscribe at any time).",
            "To prevent fraud and keep our store secure.",
          ]}
        />
      </ContentSection>

      <ContentSection heading="Sharing your information">
        <p>
          We share your information only with the partners needed to run the store — such as our
          courier, payment and email providers — and only to the extent required to fulfil your
          order. We do not sell your personal information.
        </p>
      </ContentSection>

      <ContentSection heading="Cookies">
        <p>
          We use essential cookies to keep your cart and session working, and may use analytics
          cookies to understand how the store is used. You can control cookies through your browser
          settings.
        </p>
      </ContentSection>

      <ContentSection heading="Data retention & security">
        <p>
          We keep your information for as long as needed to provide our services and meet legal
          obligations, and we apply reasonable safeguards to protect it. No method of transmission or
          storage is completely secure, but we work to protect your data.
        </p>
      </ContentSection>

      <ContentSection heading="Your rights">
        <p>
          You may request access to, correction of, or deletion of your personal information. Manage
          your profile from <a href="/account/profile">your account</a>, or contact us for any other
          request.
        </p>
      </ContentSection>

      <ContentSection heading="Contact">
        <p>
          For privacy questions or requests, please reach out to our support team using the contact
          details in the site footer. See also our <a href="/terms">terms of service</a>.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
