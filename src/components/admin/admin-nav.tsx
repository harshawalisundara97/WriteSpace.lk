"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Package, Tag, Users, ScrollText, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/promotions", label: "Promotions", icon: Tag },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/admin/staff", label: "Staff", icon: Shield },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link key={href} href={href}
            className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
              active ? "bg-brand text-paper" : "text-ink-soft hover:bg-paper-2 hover:text-ink")}>
            <Icon className="h-4 w-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
