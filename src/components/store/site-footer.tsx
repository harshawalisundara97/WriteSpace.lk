"use client";

import Link from "next/link";
import { useI18n, LanguageSwitcher } from "@/components/i18n/i18n-provider";
import { Mail, Phone, MapPin, Instagram, Facebook, MessageCircle } from "lucide-react";

export type FooterInfo = {
  store_name?: string | null;
  support_email?: string | null;
  support_phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
};
export function SiteFooter({ info }: { info?: FooterInfo }) {
  const i = info ?? {};
  const { t } = useI18n();
  const waDigits = i.whatsapp?.replace(/[^\d]/g, "");
  const socials = [
    i.instagram_url && { href: i.instagram_url, icon: Instagram, label: "Instagram" },
    i.facebook_url && { href: i.facebook_url, icon: Facebook, label: "Facebook" },
    waDigits && { href: `https://wa.me/${waDigits}`, icon: MessageCircle, label: "WhatsApp" },
  ].filter(Boolean) as { href: string; icon: typeof Instagram; label: string }[];

  const hasContact = i.support_email || i.support_phone || i.address;

  return (
    <footer className="mt-24 border-t border-line bg-paper-2">
      <div className="ws-container grid gap-8 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-xl font-semibold text-brand">WriteSpace<span className="text-accent">.lk</span></p>
          <p className="mt-3 max-w-xs text-sm text-ink-soft">
            {t("footer.tagline")}
          </p>
          {socials.length > 0 && (
            <div className="mt-4 flex gap-2">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-accent hover:text-accent">
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>
        <FooterCol title={t("footer.shop")} links={[[t("footer.allProducts"), "/products"], [t("nav.schoolPacks"), "/bundles"], [t("footer.bookList"), "/book-list"], [t("footer.kids"), "/c/kids-corner"], [t("footer.office"), "/c/office-desk"], [t("footer.promotions"), "/promotions"], [t("footer.bulkQuote"), "/quote"]]} />
        <FooterCol title={t("footer.account")} links={[[t("footer.signIn"), "/login"], [t("footer.register"), "/register"], [t("footer.myOrders"), "/account/orders"]]} />
        <div>
          <h4 className="text-sm font-semibold text-ink">{hasContact ? t("footer.contact") : t("footer.help")}</h4>
          {hasContact ? (
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              {i.support_email && (
                <li><a href={`mailto:${i.support_email}`} className="flex items-center gap-2 hover:text-accent"><Mail className="h-4 w-4 shrink-0" /> {i.support_email}</a></li>
              )}
              {i.support_phone && (
                <li><a href={`tel:${i.support_phone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-accent"><Phone className="h-4 w-4 shrink-0" /> {i.support_phone}</a></li>
              )}
              {i.address && (
                <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> <span>{i.address}</span></li>
              )}
            </ul>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              <li><Link href="/track" className="hover:text-accent">{t("footer.trackOrder")}</Link></li>
              <li><Link href="/promotions" className="hover:text-accent">{t("footer.promotions")}</Link></li>
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="ws-container flex flex-col items-center justify-between gap-3 py-6 text-xs text-ink-soft sm:flex-row">
          <div className="flex items-center gap-3"><p>© {new Date().getFullYear()} {i.store_name || "WriteSpace.lk"} — {t("footer.pricesInLkr")}</p><LanguageSwitcher /></div>
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link href="/about" className="hover:text-accent">{t("footer.about")}</Link>
            <Link href="/contact" className="hover:text-accent">{t("footer.contact")}</Link>
            <Link href="/faq" className="hover:text-accent">{t("footer.faq")}</Link>
            <Link href="/shipping" className="hover:text-accent">{t("footer.shipping")}</Link>
            <Link href="/returns" className="hover:text-accent">{t("footer.returns")}</Link>
            <Link href="/privacy" className="hover:text-accent">{t("footer.privacy")}</Link>
            <Link href="/terms" className="hover:text-accent">{t("footer.terms")}</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-ink-soft">
        {links.map(([label, href]) => (
          <li key={label}><Link href={href} className="hover:text-accent">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
