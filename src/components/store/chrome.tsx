"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Header } from "@/components/store/header";
import { SiteFooter, type FooterInfo } from "@/components/store/site-footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { QuickViewProvider } from "@/components/store/quick-view";
import { WishlistProvider, type WishlistItem } from "@/components/store/wishlist-provider";
import type { Category } from "@/lib/types";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import type { Locale } from "@/lib/i18n/config";
import type { MessageKey } from "@/lib/i18n/dictionaries";

// Storefront chrome (header/footer/cart). Hidden on admin where a dedicated
// dashboard shell takes over.
export function Chrome({ categories, info, wishlist, signedIn, locale, messages, children }: { categories: Category[]; info?: FooterInfo; wishlist?: WishlistItem[]; signedIn?: boolean; locale: Locale; messages: Record<MessageKey, string>; children: ReactNode }) {
  const pathname = usePathname();
  const bare = pathname.startsWith("/admin");
  if (bare) return <>{children}</>;
  return (
    <I18nProvider locale={locale} messages={messages}>
    <WishlistProvider serverItems={wishlist} persist={signedIn}>
    <QuickViewProvider>
      <Header categories={categories} />
      <main className="flex-1">{children}</main>
      <SiteFooter info={info} />
      <CartDrawer />
    </QuickViewProvider>
    </WishlistProvider>
    </I18nProvider>
  );
}
