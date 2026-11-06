import type { Metadata } from "next";
import { Geist, Fraunces } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-provider";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { Header } from "@/components/store/header";
import { SiteFooter } from "@/components/store/site-footer";
import { getAllCategories } from "@/lib/catalog/queries";
import { getCartCount } from "@/lib/cart/actions";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const display = Fraunces({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "WriteSpace.lk — Stationery for kids & adults", template: "%s · WriteSpace.lk" },
  description: "Pens, notebooks, art supplies and desk goods for kids and grown-ups. Delivered across Sri Lanka.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [categories, count] = await Promise.all([getAllCategories(), getCartCount()]);
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <CartProvider initialCount={count}>
          <Header categories={categories} />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
