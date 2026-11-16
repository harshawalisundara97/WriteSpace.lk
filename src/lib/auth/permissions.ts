// Central permission registry. Pure module (no server-only) so client
// components, server actions, guards and tests share one source of truth.
import { z } from "zod";

export const PERMISSIONS = [
  "orders:write",
  "refunds:create",
  "products:write",
  "inventory:write",
  "promotions:write",
  "customers:write",
  "settings:write",
  "staff:write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "orders:write": "Manage orders",
  "refunds:create": "Issue refunds",
  "products:write": "Manage catalog (products, bundles, categories, reviews)",
  "inventory:write": "Adjust inventory",
  "promotions:write": "Manage promotions & banners",
  "customers:write": "Manage customers",
  "settings:write": "Edit store settings",
  "staff:write": "Manage staff access",
};

export type StaffRole = "admin" | "staff";

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && (PERMISSIONS as readonly string[]).includes(value);
}

// Drop unknown strings, dedupe, keep registry order. Admins store [] (implicit all).
export function normalizePermissions(role: StaffRole, perms: readonly unknown[]): Permission[] {
  if (role === "admin") return [];
  const set = new Set(perms.filter(isPermission));
  return PERMISSIONS.filter((p) => set.has(p));
}

export function hasPermission(role: StaffRole, perms: readonly string[], permission: Permission): boolean {
  return role === "admin" || perms.includes(permission);
}

export const staffInputSchema = z.object({
  role: z.enum(["admin", "staff"]),
  permissions: z.array(z.string()).max(PERMISSIONS.length * 2).default([]),
});

export const staffInviteSchema = staffInputSchema.extend({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export interface StaffChange {
  actor: { id: string; role: StaffRole; permissions: readonly string[] };
  target: { id: string; role: StaffRole; permissions: readonly string[] } | null; // null = not currently staff
  next: { role: StaffRole; permissions: readonly string[] } | null; // null = remove access
  adminCount: number; // current number of admins
}

// Returns an error message if the change is not allowed, otherwise null.
export function checkStaffChange({ actor, target, next, adminCount }: StaffChange): string | null {
  const actorIsAdmin = actor.role === "admin";

  if (target && target.id === actor.id) {
    if (!next) return "You can't remove your own access.";
    const changed = next.role !== target.role ||
      !samePerms(normalizePermissions(next.role, next.permissions), normalizePermissions(target.role, target.permissions));
    if (changed) return "You can't change your own role or permissions.";
  }

  // Only admins may touch admins or grant the admin role.
  if (!actorIsAdmin && (target?.role === "admin" || next?.role === "admin")) {
    return "Only an admin can grant, change or remove admin access.";
  }
  // Staff can't grant permissions they don't hold (no escalation).
  if (!actorIsAdmin && next) {
    const extra = normalizePermissions(next.role, next.permissions).filter((p) => !actor.permissions.includes(p));
    if (extra.length) return `You can't grant permissions you don't have: ${extra.join(", ")}`;
  }

  // Never leave the store without an admin.
  const losesAdmin = target?.role === "admin" && (!next || next.role !== "admin");
  if (losesAdmin && adminCount <= 1) return "There must be at least one admin.";

  return null;
}

function samePerms(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((p) => b.includes(p));
}
