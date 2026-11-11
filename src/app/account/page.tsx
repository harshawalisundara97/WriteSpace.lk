import Link from "next/link";
import { Package, User, Heart, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/user";
import { getMyOrders } from "@/lib/account/queries";
import { StatusBadge } from "@/components/store/status-badge";
import { formatMoney } from "@/lib/pricing/money";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/lib/types";

export const metadata = { title: "My account" };
const fmtDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));

export default async function AccountOverview() {
  const [user, orders] = await Promise.all([getCurrentUser(), getMyOrders()]);
  const firstName = (user?.full_name ?? "there").split(" ")[0];
  const active = orders.filter((o) => ["paid", "fulfilled", "shipped"].includes(o.status)).length;
  const recent = orders.slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Hello, {firstName} 👋</h1>
        <p className="mt-1 text-sm text-ink-soft">Here’s what’s happening with your account.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-sm text-ink-soft">Total orders</p>
          <p className="mt-1 font-display text-2xl font-semibold">{orders.length}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-sm text-ink-soft">In progress</p>
          <p className="mt-1 font-display text-2xl font-semibold">{active}</p>
        </div>
        <Link href="/account/profile" className="group rounded-2xl border border-line bg-paper p-5 transition-colors hover:border-ink/30">
          <p className="text-sm text-ink-soft">Profile</p>
          <p className="mt-1 flex items-center gap-1 font-medium">Edit details <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></p>
        </Link>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Recent orders</h2>
          <Link href="/account/orders" className="text-sm text-accent hover:underline">View all</Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center text-ink-soft">
            <p>No orders yet.</p>
            <Link href="/products"><Button className="mt-4">Start shopping</Button></Link>
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {recent.map((o) => (
              <li key={o.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <Link href={`/account/orders/${o.id}`} className="font-medium text-accent hover:underline">{o.order_number}</Link>
                <span className="flex items-center gap-4">
                  <span className="hidden text-ink-soft sm:inline">{fmtDate(o.created_at)}</span>
                  <StatusBadge status={o.status as OrderStatus} />
                  <span className="w-24 text-right">{formatMoney(o.total_minor, o.currency)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <QuickLink href="/account/orders" icon={<Package className="h-5 w-5" />} label="Your orders" />
        <QuickLink href="/wishlist" icon={<Heart className="h-5 w-5" />} label="Your wishlist" />
        <QuickLink href="/account/profile" icon={<User className="h-5 w-5" />} label="Profile & settings" />
      </div>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border border-line bg-paper-2 px-5 py-4 text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-card">
      <span className="text-brand">{icon}</span> {label}
    </Link>
  );
}
