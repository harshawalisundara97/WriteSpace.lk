"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Banner } from "@/lib/types";
import { demoImage } from "@/lib/catalog/demo-image";

// Promotional ad section for the homepage. Driven by banners with the "home_ad"
// placement (managed in admin → Banners & ads). The first ad renders as a large
// feature; any further ads render as a compact 2-up row beneath it. Banners
// without an image_url fall back to a stable on-theme demo photo.
export function HomeAd({ banners }: { banners: Banner[] }) {
  if (!banners.length) return null;
  const [feature, ...rest] = banners;
  const featureImg = feature.image_url ?? demoImage(`ad-${feature.id}`, 0, 1200);

  return (
    <section className="ws-container mt-16">
      {/* Feature ad */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="group relative overflow-hidden rounded-2xl border border-line"
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: `url(${featureImg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/45 to-transparent" />
        <div className="relative flex min-h-[260px] flex-col justify-center gap-4 p-8 sm:min-h-[320px] sm:p-14">
          <p className="text-sm font-semibold uppercase tracking-wide text-paper/80">Featured offer</p>
          <h2 className="max-w-xl font-display text-3xl font-semibold leading-tight text-paper sm:text-4xl">
            {feature.title}
          </h2>
          <div>
            <Link href={feature.link_url ?? "/products"}>
              <Button size="lg" variant="primary" className="gap-2">
                Shop the offer <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Secondary ads */}
      {rest.length > 0 && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {rest.map((b, i) => {
            const img = b.image_url ?? demoImage(`ad-${b.id}`, 0, 900);
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
              >
                <Link href={b.link_url ?? "/products"} className="group block">
                  <div className="relative overflow-hidden rounded-2xl border border-line">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{ backgroundImage: `url(${img})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/75 to-ink/10" />
                    <div className="relative flex min-h-[180px] flex-col justify-end gap-2 p-6">
                      <h3 className="font-display text-xl font-semibold text-paper">{b.title}</h3>
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-paper/90">
                        Shop now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
