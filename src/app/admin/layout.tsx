import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { AdminNav } from "@/components/admin/admin-nav";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Admin" };
// Admin is user- and role-specific; never prerender it.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAdmin();
  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto flex max-w-[90rem] gap-6 px-5 py-6">
        <aside className="sticky top-6 hidden h-fit w-56 shrink-0 lg:block">
          <Link href="/" className="mb-6 block font-display text-lg font-semibold text-brand">WriteSpace<span className="text-accent">.lk</span></Link>
          <AdminNav />
          <div className="mt-8 border-t border-line pt-4">
            <p className="mb-2 text-xs capitalize text-ink-soft">{ctx.role}</p>
            <form action={signOut}><Button variant="ghost" size="sm">Sign out</Button></form>
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
