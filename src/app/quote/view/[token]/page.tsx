import { notFound } from "next/navigation";
import { getQuoteByToken } from "@/lib/quotes/queries";
import { formatMoney } from "@/lib/pricing/money";
import { quoteTotals } from "@/lib/quotes/rules";
import { QuoteAcceptForm } from "@/components/store/quote-accept";

export const metadata = { title: "Your quote", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATUS_COPY = {
  requested: "We're still preparing prices for this quote.",
  priced: null,
  accepted: "Thanks — you've accepted this quote. We'll confirm the order and send your invoice shortly.",
  converted: "This quote has been turned into an order.",
  declined: "This quote is no longer available. Contact us if you'd like a new one.",
  expired: "These prices have expired. Reply to our email and we'll refresh them.",
} as const;

export default async function QuoteView({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getQuoteByToken(token);
  if (!data) notFound();
  const { quote, items } = data;
  const priced = quote.status !== "requested";
  const totals = quoteTotals(items, quote.shipping_minor);
  const until = quote.valid_until
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Colombo" }).format(new Date(quote.valid_until))
    : null;

  return (
    <div className="ws-container max-w-3xl py-10">
      <p className="text-sm text-ink-soft">Quote {quote.quote_number}{quote.company ? ` · ${quote.company}` : ""}</p>
      <h1 className="mt-1 font-display text-3xl font-semibold">Your bulk quote</h1>
      {STATUS_COPY[quote.status] && <p role="status" className="mt-4 rounded-xl bg-paper-2 p-4 text-sm">{STATUS_COPY[quote.status]}</p>}
      {quote.status === "priced" && until && <p className="mt-4 text-sm">Prices held until <strong>{until}</strong>.</p>}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-paper-2 text-left text-ink-soft">
            <tr><th className="px-4 py-3">Item</th><th className="px-4 py-3 text-right">Qty</th>{priced && <><th className="px-4 py-3 text-right">Unit</th><th className="px-4 py-3 text-right">Total</th></>}</tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const unit = i.quoted_unit_minor ?? i.list_unit_minor;
              return (
                <tr key={i.id} className="border-t border-line">
                  <td className="px-4 py-3">{i.name}{i.sku && <span className="block text-xs text-ink-soft">{i.sku}</span>}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{i.qty.toLocaleString("en-LK")}</td>
                  {priced && <>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(unit, "LKR")}
                      {unit < i.list_unit_minor && <s className="block text-xs text-ink-soft">{formatMoney(i.list_unit_minor, "LKR")}</s>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(unit * i.qty, "LKR")}</td>
                  </>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {priced && (
        <dl className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-ink-soft">Items</dt><dd className="tabular-nums">{formatMoney(totals.subtotal_minor, "LKR")}</dd></div>
          {quote.shipping_minor > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Delivery</dt><dd className="tabular-nums">{formatMoney(quote.shipping_minor, "LKR")}</dd></div>}
          {totals.savings_minor > 0 && <div className="flex justify-between text-green-700"><dt>You save</dt><dd className="tabular-nums">{formatMoney(totals.savings_minor, "LKR")}</dd></div>}
          <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Total</dt><dd className="font-display text-lg tabular-nums">{formatMoney(totals.total_minor, "LKR")}</dd></div>
        </dl>
      )}
      {priced && (
        <p className="mt-6 text-sm">
          <a href={`/quote/view/${token}/pdf`} target="_blank" rel="noopener" className="text-accent hover:underline">Printable quote (save as PDF)</a>
        </p>
      )}
      {quote.status === "priced" && <QuoteAcceptForm token={token} phone={quote.phone ?? ""} />}
    </div>
  );
}
