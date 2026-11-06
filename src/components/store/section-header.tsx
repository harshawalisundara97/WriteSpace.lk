import Link from "next/link";

export function SectionHeader({ title, subtitle, href }: { title: string; subtitle?: string; href?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {href && <Link href={href} className="text-sm font-medium text-accent hover:text-accent-600">View all →</Link>}
    </div>
  );
}
