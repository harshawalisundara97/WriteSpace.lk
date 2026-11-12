import type { Metadata } from "next";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { ContentPage, ContentSection } from "@/components/store/content-page";
import { ContactForm } from "@/components/store/contact-form";
import { getStoreSettings } from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Get in touch with WriteSpace.lk — questions about an order, a product or bulk enquiries. Send us a message and we'll reply by email.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const s = await getStoreSettings();
  const waDigits = s.whatsapp?.replace(/[^\d]/g, "");

  const details = [
    s.support_email && {
      icon: Mail,
      label: "Email",
      value: s.support_email,
      href: `mailto:${s.support_email}`,
    },
    s.support_phone && {
      icon: Phone,
      label: "Phone",
      value: s.support_phone,
      href: `tel:${s.support_phone.replace(/\s/g, "")}`,
    },
    waDigits && {
      icon: MessageCircle,
      label: "WhatsApp",
      value: s.whatsapp,
      href: `https://wa.me/${waDigits}`,
    },
    s.address && { icon: MapPin, label: "Address", value: s.address, href: undefined },
  ].filter(Boolean) as { icon: typeof Mail; label: string; value: string; href?: string }[];

  return (
    <ContentPage
      title="Contact us"
      intro="Questions about an order, a product or a bulk enquiry? Send us a message and we'll get back to you by email, usually within one working day."
    >
      {details.length > 0 && (
        <ContentSection heading="Reach us directly">
          <ul className="not-prose grid gap-3 sm:grid-cols-2">
            {details.map((d) => (
              <li key={d.label} className="flex items-start gap-3 rounded-xl border border-line bg-paper-2 p-4">
                <d.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink-soft">{d.label}</p>
                  {d.href ? (
                    <a
                      href={d.href}
                      {...(d.href.startsWith("https://wa.me") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="text-sm text-ink hover:text-accent"
                    >
                      {d.value}
                    </a>
                  ) : (
                    <p className="text-sm text-ink">{d.value}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </ContentSection>
      )}

      <ContentSection heading="Send us a message">
        <ContactForm />
      </ContentSection>
    </ContentPage>
  );
}
