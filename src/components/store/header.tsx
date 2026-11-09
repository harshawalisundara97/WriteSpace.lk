"use client";

import Link from "next/link";
import { ShoppingBag, Search, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "@/components/cart/cart-provider";
import { SearchBox } from "@/components/store/search-box";
import type { Category } from "@/lib/types";

export function Header({ categories }: { categories: Category[] }) {
  const cart = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const topCats = categories.filter((c) => !c.parent_id);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="ws-container flex h-16 items-center gap-4">
        <button className="lg:hidden" aria-label="Menu" onClick={() => setMenuOpen((v) => !v)}>
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        <Link href="/" className="font-display text-xl font-semibold text-brand">
          WriteSpace<span className="text-accent">.lk</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-6 lg:flex">
          {topCats.map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`} className="text-sm text-ink-soft transition-colors hover:text-ink">
              {c.name}
            </Link>
          ))}
          <Link href="/promotions" className="text-sm font-medium text-accent hover:text-accent-600">Deals</Link>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button aria-label="Search" onClick={() => setSearchOpen(true)} className="flex h-10 items-center gap-2 rounded-full px-2.5 text-ink-soft hover:bg-paper-2 sm:border sm:border-line sm:pr-2">
            <Search className="h-5 w-5" />
            <span className="hidden text-sm sm:inline">Search</span>
            <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-xs sm:inline">⌘K</kbd>
          </button>
          <button aria-label="Cart" data-cart-icon onClick={cart.open} className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-paper-2">
            <ShoppingBag className="h-5 w-5" />
            <AnimatePresence>
              {cart.count > 0 && (
                <motion.span
                  key={cart.count}
                  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-semibold text-white"
                >
                  {cart.count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* mobile nav */}
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-line lg:hidden"
          >
            <div className="ws-container flex flex-col gap-1 py-3">
              {topCats.map((c) => (
                <Link key={c.id} href={`/c/${c.slug}`} onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2 text-ink-soft hover:bg-paper-2">
                  {c.name}
                </Link>
              ))}
              <Link href="/promotions" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2 font-medium text-accent">Deals</Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      <SearchBox open={searchOpen} onClose={() => setSearchOpen(false)} categories={categories} />
    </header>
  );
}
