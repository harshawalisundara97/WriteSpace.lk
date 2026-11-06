import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-paper-2">
      <div className="ws-container grid gap-8 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-xl font-semibold text-brand">WriteSpace<span className="text-accent">.lk</span></p>
          <p className="mt-3 max-w-xs text-sm text-ink-soft">
            Stationery for kids and grown-ups — pens, paper, art supplies and desk goods, delivered across Sri Lanka.
          </p>
        </div>
        <FooterCol title="Shop" links={[["All products", "/products"], ["Kids", "/c/kids-corner"], ["Office & Desk", "/c/office-desk"], ["Promotions", "/promotions"]]} />
        <FooterCol title="Help" links={[["Track order", "/account/orders"], ["Shipping", "/#"], ["Returns", "/#"], ["Contact", "/#"]]} />
        <FooterCol title="Account" links={[["Sign in", "/login"], ["Register", "/register"], ["My orders", "/account/orders"]]} />
      </div>
      <div className="border-t border-line py-6 text-center text-xs text-ink-soft">
        © {new Date().getFullYear()} WriteSpace.lk — All prices in LKR.
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
