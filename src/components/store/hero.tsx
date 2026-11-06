"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { Banner } from "@/lib/types";

const PALETTES = [
  "from-[#ffe3d3] via-[#ffd0bd] to-[#ffb79e]",
  "from-[#e2dfff] via-[#cfcaff] to-[#b4acf2]",
  "from-[#d4f3ec] via-[#bdeade] to-[#9fe0d0]",
];

export function Hero({ banners }: { banners: Banner[] }) {
  const slides = banners.length ? banners : [{ id: "default", title: "Stationery you'll love to use", link_url: "/products", image_url: null, placement: "home_hero", position: 0 }];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setI((v) => (v + 1) % slides.length), 5500);
    return () => clearInterval(id);
  }, [slides.length]);

  const s = slides[i];
  return (
    <section className="ws-container pt-6">
      <div className="relative h-[clamp(320px,46vw,520px)] overflow-hidden rounded-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={s.id}
            initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute inset-0 bg-gradient-to-br ${PALETTES[i % PALETTES.length]}`}
            style={s.image_url ? { backgroundImage: `url(${s.image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          />
        </AnimatePresence>
        <div className="relative flex h-full flex-col justify-center gap-5 p-8 sm:p-14">
          <motion.div key={`txt-${s.id}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="max-w-lg">
            <p className="mb-2 text-sm font-medium uppercase tracking-wide text-ink/70">WriteSpace.lk</p>
            <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">{s.title}</h1>
            <Link href={s.link_url ?? "/products"}>
              <Button className="mt-6" size="lg" variant="primary">Shop now</Button>
            </Link>
          </motion.div>
        </div>
        {slides.length > 1 && (
          <div className="absolute bottom-5 left-8 flex gap-2 sm:left-14">
            {slides.map((_, idx) => (
              <button key={idx} aria-label={`Slide ${idx + 1}`} onClick={() => setI(idx)}
                className={`h-2 rounded-full transition-all ${idx === i ? "w-7 bg-ink" : "w-2 bg-ink/30"}`} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
