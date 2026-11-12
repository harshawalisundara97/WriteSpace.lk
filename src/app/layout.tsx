import type { Metadata } from "next";
import { Geist, Fraunces } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-provider";
import { Chrome } from "@/components/store/chrome";
import { getAllCategories, getStoreSettings } from "@/lib/catalog/queries";
import { getCartCount } from "@/lib/cart/actions";
import { getWishlistItems } from "@/lib/account/wishlist";
import { getCurrentUser } from "@/lib/auth/user";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const display = Fraunces({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: { default: "WriteSpace.lk — Stationery for kids & adults", template: "%s · WriteSpace.lk" },
  description: "Pens, notebooks, art supplies and desk goods for kids and grown-ups. Delivered across Sri Lanka.",
  metadataBase: new URL(SITE_URL),
  applicationName: "WriteSpace.lk",
  keywords: ["stationery Sri Lanka", "pens", "notebooks", "art supplies", "school supplies", "office supplies", "WriteSpace"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "WriteSpace.lk",
    url: SITE_URL,
    title: "WriteSpace.lk — Stationery for kids & adults",
    description: "Pens, notebooks, art supplies and desk goods for kids and grown-ups. Delivered across Sri Lanka.",
    locale: "en_LK",
  },
  twitter: {
    card: "summary_large_image",
    title: "WriteSpace.lk — Stationery for kids & adults",
    description: "Pens, notebooks, art supplies and desk goods, delivered across Sri Lanka.",
  },
  robots: { index: true, follow: true },
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [categories, count, settings, wishlist, user] = await Promise.all([
    getAllCategories(), getCartCount(), getStoreSettings(), getWishlistItems(), getCurrentUser(),
  ]);
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <CartProvider initialCount={count}>
          <Chrome categories={categories} info={settings} wishlist={wishlist} signedIn={!!user}>{children}</Chrome>
        </CartProvider>
      </body>
    </html>
  );
}
