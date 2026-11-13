"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Package, User, MapPin, Heart } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "Overview", icon: LayoutGrid },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/profile", label: "Profile", icon: User },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/account" ? pathname === "/account" : pathname.startsWith(href);
        return (
          <Link key={href} href={href}
            className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
              active ? "bg-brand text-paper" : "text-ink-soft hover:bg-paper-2 hover:text-ink")}>
            <Icon className="h-4 w-4" /> {label}
          </Link>
        );
      })}
      <div className="border-t border-line pt-2">
        <form action={signOut}><Button variant="ghost" size="sm" className="w-full justify-start">Sign out</Button></form>
      </div>
    </nav>
  );
}
