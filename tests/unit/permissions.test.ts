import { describe, it, expect } from "vitest";
import {
  PERMISSIONS, PERMISSION_LABELS, isPermission, normalizePermissions, hasPermission,
  checkStaffChange, staffInviteSchema,
} from "@/lib/auth/permissions";

const admin = { id: "a1", role: "admin" as const, permissions: [] };
const staffMgr = { id: "s1", role: "staff" as const, permissions: ["staff:write", "orders:write"] };

describe("permission registry", () => {
  it("labels every permission", () => {
    for (const p of PERMISSIONS) expect(PERMISSION_LABELS[p]).toBeTruthy();
  });
  it("isPermission rejects unknown strings", () => {
    expect(isPermission("orders:write")).toBe(true);
    expect(isPermission("orders:delete")).toBe(false);
    expect(isPermission(42)).toBe(false);
  });
  it("normalizePermissions drops unknowns, dedupes, orders; admin = []", () => {
    expect(normalizePermissions("staff", ["staff:write", "bogus", "orders:write", "orders:write"])).toEqual(["orders:write", "staff:write"]);
    expect(normalizePermissions("admin", ["orders:write"])).toEqual([]);
  });
  it("hasPermission: admin implicit all", () => {
    expect(hasPermission("admin", [], "settings:write")).toBe(true);
    expect(hasPermission("staff", ["orders:write"], "settings:write")).toBe(false);
  });
  it("invite schema normalizes email and rejects bad input", () => {
    expect(staffInviteSchema.parse({ email: " A@B.lk ", role: "staff" }).email).toBe("a@b.lk");
    expect(staffInviteSchema.safeParse({ email: "nope", role: "staff" }).success).toBe(false);
    expect(staffInviteSchema.safeParse({ email: "a@b.lk", role: "owner" }).success).toBe(false);
  });
});

describe("checkStaffChange", () => {
  const staffTarget = { id: "t1", role: "staff" as const, permissions: ["orders:write"] };
  const adminTarget = { id: "a2", role: "admin" as const, permissions: [] };

  it("blocks self-removal and self role/perm changes", () => {
    expect(checkStaffChange({ actor: admin, target: { ...admin }, next: null, adminCount: 2 })).toMatch(/own access/);
    expect(checkStaffChange({ actor: admin, target: { ...admin }, next: { role: "staff", permissions: [] }, adminCount: 2 })).toMatch(/own role/);
    expect(checkStaffChange({ actor: staffMgr, target: { ...staffMgr }, next: { role: "staff", permissions: ["staff:write"] }, adminCount: 1 })).toMatch(/own role/);
  });
  it("allows a no-op self save", () => {
    expect(checkStaffChange({ actor: admin, target: { ...admin }, next: { role: "admin", permissions: [] }, adminCount: 1 })).toBeNull();
  });
  it("protects the last admin", () => {
    expect(checkStaffChange({ actor: admin, target: adminTarget, next: { role: "staff", permissions: [] }, adminCount: 1 })).toMatch(/at least one admin/);
    expect(checkStaffChange({ actor: admin, target: adminTarget, next: null, adminCount: 1 })).toMatch(/at least one admin/);
    expect(checkStaffChange({ actor: admin, target: adminTarget, next: null, adminCount: 2 })).toBeNull();
  });
  it("staff cannot touch admins or grant admin", () => {
    expect(checkStaffChange({ actor: staffMgr, target: adminTarget, next: null, adminCount: 3 })).toMatch(/Only an admin/);
    expect(checkStaffChange({ actor: staffMgr, target: staffTarget, next: { role: "admin", permissions: [] }, adminCount: 3 })).toMatch(/Only an admin/);
    expect(checkStaffChange({ actor: staffMgr, target: null, next: { role: "admin", permissions: [] }, adminCount: 3 })).toMatch(/Only an admin/);
  });
  it("staff cannot grant permissions they lack", () => {
    expect(checkStaffChange({ actor: staffMgr, target: staffTarget, next: { role: "staff", permissions: ["settings:write"] }, adminCount: 1 })).toMatch(/settings:write/);
    expect(checkStaffChange({ actor: staffMgr, target: null, next: { role: "staff", permissions: ["orders:write"] }, adminCount: 1 })).toBeNull();
  });
  it("admin can freely manage staff", () => {
    expect(checkStaffChange({ actor: admin, target: staffTarget, next: { role: "admin", permissions: [] }, adminCount: 1 })).toBeNull();
  });
});
