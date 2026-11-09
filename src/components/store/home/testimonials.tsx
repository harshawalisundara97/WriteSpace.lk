import { StarRating } from "@/components/store/star-rating";

const ITEMS = [
  { quote: "The quality is wonderful and delivery was faster than I expected. My go-to for stationery now.", name: "Nimali P.", role: "Colombo", rating: 5 },
  { quote: "Beautiful notebooks and the gel pens are a hit with my kids. Lovely packaging too.", name: "Rajiv S.", role: "Kandy", rating: 5 },
  { quote: "Great prices and the bamboo organizer tidied up my whole desk. Highly recommend.", name: "Fathima N.", role: "Galle", rating: 4 },
];

export function Testimonials() {
  return (
    <section className="ws-container mt-20">
      <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Loved by writers &amp; makers</h2>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {ITEMS.map((t) => (
          <figure key={t.name} className="rounded-2xl border border-line bg-paper p-6">
            <StarRating value={t.rating} />
            <blockquote className="mt-3 text-sm text-ink">“{t.quote}”</blockquote>
            <figcaption className="mt-4 text-sm text-ink-soft">{t.name} · {t.role}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
