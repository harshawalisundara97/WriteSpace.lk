"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, ZoomIn } from "lucide-react";
import type { ProductImage } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONES = [
  "from-[#ffd9cf] to-[#ffb3a0]",
  "from-[#d7d4ff] to-[#b3aef0]",
  "from-[#cdeee6] to-[#9fe0d0]",
  "from-[#ffe9bd] to-[#ffcf7a]",
];

function hash(id: string, mod: number) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % mod;
}

// Premium gallery. Uses real images when present; otherwise renders tasteful
// tonal placeholder tiles so the layout reads complete before photos are added.
export function ProductGallery({ images, name, productId }: { images: ProductImage[]; name: string; productId: string }) {
  const hasImages = images.length > 0;
  const tiles = hasImages
    ? images.map((img) => ({ url: img.url, alt: img.alt ?? name }))
    : TONES.map((t, i) => ({ grad: t, key: i }));
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  const main = tiles[active] as { url?: string; grad?: string; alt?: string };

  return (
    <div className="flex flex-col gap-3">
      <motion.button
        layout
        onClick={() => hasImages && setLightbox(true)}
        onMouseMove={(e) => {
          if (!hasImages) return;
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
        className="group relative aspect-square overflow-hidden rounded-2xl border border-line bg-paper-2"
      >
        <div
          className={cn("absolute inset-0 bg-gradient-to-br transition-transform duration-500", !main.url && main.grad, zoom ? "scale-150" : "scale-100")}
          style={
            main.url
              ? { backgroundImage: `url(${main.url})`, backgroundSize: "cover", backgroundPosition: zoom ? `${zoom.x}% ${zoom.y}%` : "center" }
              : undefined
          }
        >
          {!main.url && <span className="grid h-full place-items-center font-display text-7xl text-ink/20">{name.charAt(0)}</span>}
        </div>
        {hasImages && (
          <span className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-ink/70 text-paper opacity-0 transition-opacity group-hover:opacity-100">
            <ZoomIn className="h-4 w-4" />
          </span>
        )}
      </motion.button>

      <div className="grid grid-cols-4 gap-3">
        {tiles.map((t, i) => {
          const tile = t as { url?: string; grad?: string };
          return (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-xl border-2 transition-colors",
                active === i ? "border-brand" : "border-line hover:border-ink/30",
              )}
            >
              <span
                className={cn("absolute inset-0 bg-gradient-to-br", !tile.url && (tile.grad ?? TONES[hash(productId + i, TONES.length)]))}
                style={tile.url ? { backgroundImage: `url(${tile.url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
              />
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {lightbox && main.url && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-6" onClick={() => setLightbox(false)}
          >
            <button aria-label="Close" className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-paper/20 text-paper"><X className="h-5 w-5" /></button>
            <motion.img
              initial={{ scale: 0.95 }} animate={{ scale: 1 }}
              src={main.url} alt={main.alt ?? name} className="max-h-[85vh] max-w-full rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
