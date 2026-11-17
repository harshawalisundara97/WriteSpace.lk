import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/auth/guards";
import { getAdminQuote } from "@/lib/admin/quote-queries";
import { PageHeader, Card } from "@/components/admin/ui";
import { QuoteStatusBadge } from "@/components/admin/quote-status";
import { QuotePricer } from "@/components/admin/quote-pricer";
import { QuoteConvert } from "@/components/admin/quote-convert";
import Link from "next/link";

export default async function AdminQuoteDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePerm("orders:write");
  const { id } = await params;
  const data = await getAdminQuote(id);
  if (!data) notFound();
  const { quote, items } = data;
  const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" });
  return (
    <div className="space-y-6">
      <PageHeader
        title={quote.quote_number}
        breadcrumbs={[{ label: "Quotes", href: "/admin/quotes" }, { label: quote.quote_number }]}
        actions={<QuoteStatusBadge status={quote.status} />}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <QuotePricer
          quoteId={quote.id}
          status={quote.status}
          items={items}
          shippingMinor={quote.shipping_minor}
          adminNotes={quote.admin_notes ?? ""}
        />
        <div className="space-y-4">
          {(quote.status === "accepted" || quote.status === "converted") && (
            <Card>
              <h2 className="font-medium">{quote.status === "accepted" ? "Accepted — ready to order" : "Order"}</h2>
              {quote.po_number && <p className="mt-2 text-sm">PO <strong>{quote.po_number}</strong></p>}
              {quote.delivery_address && (() => {
                const a = quote.delivery_address as Record<string, string>;
                return <p className="mt-2 text-sm text-ink-soft">{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}{a.district ? `, ${a.district}` : ""} {a.postal_code}<br />{a.phone}</p>;
              })()}
              <div className="mt-4">
                {quote.status === "accepted"
                  ? <QuoteConvert quoteId={quote.id} />
                  : quote.order_id && <Link href={`/admin/orders/${quote.order_id}`} className="text-sm font-medium text-accent hover:underline">View order →</Link>}
              </div>
            </Card>
          )}
          <Card>
            <h2 className="font-medium">Buyer</h2>
            <dl className="mt-3 space-y-1 text-sm">
              <dd className="font-medium">{quote.contact_name}</dd>
              {quote.company && <dd>{quote.company}</dd>}
              <dd><a href={`mailto:${quote.email}`} className="text-accent hover:underline">{quote.email}</a></dd>
              {quote.phone && <dd>{quote.phone}</dd>}
            </dl>
            {quote.notes && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-paper-2 p-3 text-sm">{quote.notes}</p>}
          </Card>
          <Card>
            <h2 className="font-medium">Timeline</h2>
            <ul className="mt-3 space-y-1 text-sm text-ink-soft">
              <li>Requested {fmt(quote.created_at)}</li>
              {quote.sent_at && <li>Sent {fmt(quote.sent_at)}</li>}
              {quote.valid_until && <li>Valid until {fmt(quote.valid_until)}</li>}
              {quote.accepted_at && <li>Accepted {fmt(quote.accepted_at)}</li>}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
