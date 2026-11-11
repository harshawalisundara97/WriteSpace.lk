import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/user";
import { AccountNav } from "@/components/account/account-nav";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="ws-container grid min-h-[50vh] place-items-center py-16 text-center">
        <div>
          <h1 className="font-display text-2xl font-semibold">Sign in to your account</h1>
          <p className="mt-2 text-ink-soft">Track orders, save your details and check out faster.</p>
          <div className="mt-5 flex justify-center gap-3">
            <Link href="/login?next=/account"><Button>Sign in</Button></Link>
            <Link href="/register"><Button variant="outline">Create account</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-container py-10">
      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-4 text-sm text-ink-soft">Signed in as<br /><span className="font-medium text-ink">{user.full_name ?? user.email}</span></p>
          <AccountNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
