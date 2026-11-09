"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, motion } from "motion/react";

const STATS = [
  { value: 12000, suffix: "+", label: "Happy customers" },
  { value: 500, suffix: "+", label: "Products in store" },
  { value: 48, suffix: "h", label: "Island-wide delivery" },
  { value: 4.8, suffix: "★", label: "Average rating", decimals: 1 },
];

function Counter({ value, suffix, decimals = 0 }: { value: number; suffix: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const dur = 1200;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);
  return <span ref={ref}>{n.toFixed(decimals)}{suffix}</span>;
}

export function StatsBand() {
  return (
    <section className="ws-container mt-16">
      <div className="grid grid-cols-2 gap-6 rounded-2xl border border-line bg-paper-2 p-8 sm:grid-cols-4">
        {STATS.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="text-center">
            <p className="font-display text-3xl font-semibold text-brand sm:text-4xl"><Counter value={s.value} suffix={s.suffix} decimals={s.decimals} /></p>
            <p className="mt-1 text-sm text-ink-soft">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
