import type { Metadata } from "next";
import { localeAlternates } from "@/lib/i18n/seo-server";
import { BookListClient } from "@/components/store/book-list";

const META: Metadata = {
  title: "School book list to cart",
  description: "Paste your child's school stationery list and we'll match every item to WriteSpace.lk products, ready to add to your cart.",
};

export async function generateMetadata(): Promise<Metadata> {
  return { ...META, alternates: await localeAlternates("/book-list") };
}

export default function BookListPage() {
  return (
    <div className="ws-container py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Shop your school book list</h1>
        <p className="mt-3 text-base text-ink-soft">
          Paste the list from school, one item per line. We&apos;ll find each item, you check the matches, then add everything to your cart at once.
        </p>
        <BookListClient />
      </div>
    </div>
  );
}
