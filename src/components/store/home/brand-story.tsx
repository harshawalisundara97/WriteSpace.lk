import Link from "next/link";
import { Button } from "@/components/ui/button";

export function BrandStory() {
  return (
    <section className="ws-container mt-20">
      <div className="grid items-center gap-8 overflow-hidden rounded-2xl border border-line md:grid-cols-2">
        <div className="relative h-full min-h-[280px] bg-gradient-to-br from-[#d7d4ff] via-[#cfcaff] to-[#b4acf2]">
          <span className="absolute inset-0 grid place-items-center font-display text-7xl text-ink/15">WS</span>
        </div>
        <div className="p-8 sm:p-10">
          <p className="text-sm font-medium uppercase tracking-wide text-accent">Our story</p>
          <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Stationery that makes everyday writing a joy</h2>
          <p className="mt-4 text-ink-soft">We started WriteSpace to bring thoughtfully-made pens, paper and desk goods to every home and classroom in Sri Lanka — for little doodlers and serious note-takers alike. Everything we stock is chosen for how it feels in the hand.</p>
          <Link href="/products"><Button className="mt-6" variant="outline">Explore the collection</Button></Link>
        </div>
      </div>
    </section>
  );
}
