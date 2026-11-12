"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Header } from "@/components/store/header";
import { SiteFooter, type FooterInfo } from "@/components/store/site-footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { QuickViewProvider } from "@/components/store/quick-view";
import { WishlistProvider, type WishlistItem } from "@/components/store/wishlist-provider";
import type { Category } from "@/lib/types";

// Storefront chrome (header/footer/cart). Hidden on admin where a dedicated
// dashboard shell takes over.
export function Chrome({ categories, info, wishlist, signedIn, children }: { categories: Category[]; info?: FooterInfo; wishlist?: WishlistItem[]; signedIn?: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const bare = pathname.startsWith("/admin");
  if (bare) return <>{children}</>;
  return (
    <WishlistProvider serverItems={wishlist} persist={signedIn}>
    <QuickViewProvider>
      <Header categories={categories} />
      <main className="flex-1">{children}</main>
      <SiteFooter info={info} />
      <CartDrawer />
    </QuickViewProvider>
    </WishlistProvider>
  );
}
