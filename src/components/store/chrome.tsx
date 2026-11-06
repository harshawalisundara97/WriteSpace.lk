"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Header } from "@/components/store/header";
import { SiteFooter } from "@/components/store/site-footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import type { Category } from "@/lib/types";

// Storefront chrome (header/footer/cart). Hidden on admin where a dedicated
// dashboard shell takes over.
export function Chrome({ categories, children }: { categories: Category[]; children: ReactNode }) {
  const pathname = usePathname();
  const bare = pathname.startsWith("/admin");
  if (bare) return <>{children}</>;
  return (
    <>
      <Header categories={categories} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <CartDrawer />
    </>
  );
}
