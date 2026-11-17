import Link from "next/link";
import { requirePerm } from "@/lib/auth/guards";
import { getAdminQuotes } from "@/lib/admin/quote-queries";
import { PageHeader } from "@/components/admin/ui";
import { QuoteStatusBadge } from "@/components/admin/quote-status";
import { formatMoney } from "@/lib/pricing/money";

type SP = Record<string, string | string[] | undefined>;
const STATUSES = ["requested", "priced", "accepted", "converted", "declined", "expired"] as const;

export default async function AdminQuotesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePerm("orders:write");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const quotes = await getAdminQuotes({ status, q });

  return (
    <div className="space-y-6">
      <PageHeader title="Quotes" description="Bulk quote requests from offices and schools. Price them, send, and track acceptance." />
      <form className="flex flex-wrap gap-2" action="/admin/quotes">
        <input name="q" defaultValue={q} placeholder="Search quote #, email or company" className="h-10 w-64 rounded-xl border border-line bg-paper px-3 text-sm outline-none" />
        <select name="status" defaultValue={status ?? ""} className="h-10 rounded-xl border border-line bg-paper px-3 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="h-10 rounded-xl bg-brand px-4 text-sm text-paper">Filter</button>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-paper-2 text-left text-ink-soft">
            <tr><th className="px-4 py-3">Quote</th><th className="px-4 py-3">Buyer</th><th className="px-4 py-3">Requested</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th></tr>
          </thead>
          <tbody>
            {quotes.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-soft">No quotes yet.</td></tr>}
            {quotes.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-4 py-3"><Link href={`/admin/quotes/${r.id}`} className="font-medium text-accent hover:underline">{r.quote_number}</Link></td>
                <td className="px-4 py-3">{r.company ?? r.contact_name}<span className="block text-ink-soft">{r.email}</span></td>
                <td className="px-4 py-3 text-ink-soft">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3"><QuoteStatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(r.total_minor, "LKR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
