import type { ReactNode } from "react";

/**
 * Shared layout for static content / policy pages (Shipping, Returns, Privacy,
 * Terms, and later About/FAQ). Storefront chrome (header/footer) is applied by
 * the root layout, so these pages only provide their own body.
 */
export function ContentPage({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro?: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="ws-container py-12">
      <article className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{title}</h1>
        {intro && <p className="mt-3 text-base text-ink-soft">{intro}</p>}
        {updated && <p className="mt-2 text-xs text-ink-soft">Last updated: {updated}</p>}
        <div className="mt-10 space-y-10">{children}</div>
      </article>
    </div>
  );
}

/** A titled section within a content page. */
export function ContentSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold text-ink">{heading}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-ink-soft [&_a]:text-accent [&_a:hover]:underline [&_strong]:text-ink">
        {children}
      </div>
    </section>
  );
}

/** Simple bulleted list styled for content pages. */
export function ContentList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="ml-5 list-disc space-y-2">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
