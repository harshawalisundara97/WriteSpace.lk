"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Package, Boxes, FolderTree, Tag, Images, Users, ScrollText, Settings, Shield, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/types";

interface NavItem { href: string; label: string; icon: LucideIcon; perm?: string; adminOnly?: boolean }

export const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, perm: "orders:write" },
  { href: "/admin/products", label: "Products", icon: Package, perm: "products:write" },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes, perm: "inventory:write" },
  { href: "/admin/categories", label: "Categories", icon: FolderTree, perm: "products:write" },
  { href: "/admin/promotions", label: "Promotions", icon: Tag, perm: "promotions:write" },
  { href: "/admin/banners", label: "Banners", icon: Images, perm: "promotions:write" },
  { href: "/admin/customers", label: "Customers", icon: Users, perm: "customers:write" },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, adminOnly: true },
  { href: "/admin/staff", label: "Staff", icon: Shield, perm: "staff:write" },
  { href: "/admin/settings", label: "Settings", icon: Settings, perm: "settings:write" },
];

export function visibleNav(role: AppRole, permissions: string[]): NavItem[] {
  if (role === "admin") return NAV_ITEMS;
  return NAV_ITEMS.filter((i) => {
    if (i.adminOnly) return false;
    if (!i.perm) return true;
    return permissions.includes(i.perm);
  });
}

export function AdminNav({ role, permissions, onNavigate }: { role: AppRole; permissions: string[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = visibleNav(role, permissions);
  return (
    <nav className="space-y-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} onClick={onNavigate}
            className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
              active ? "bg-brand text-paper" : "text-ink-soft hover:bg-paper-2 hover:text-ink")}>
            <Icon className="h-4 w-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
