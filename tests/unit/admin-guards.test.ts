import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createFakeDb } from "./helpers/fake-db";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error("REDIRECT:" + url); }),
}));

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  adminRow: null as { role: string; permissions: string[] } | null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => createFakeDb(() => ({ data: state.adminRow })).db,
}));

import { getAdminContext, requireAdmin, requirePerm, checkPerm, can } from "@/lib/auth/guards";

describe("admin guards", () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon";
    state.user = null;
    state.adminRow = null;
  });
  afterEach(() => { process.env = { ...env }; });

  it("returns a demo admin context when Supabase is not configured", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(await getAdminContext()).toEqual({ userId: "demo-admin", role: "admin", permissions: [] });
  });

  it("returns null for anonymous users and non-admin users", async () => {
    expect(await getAdminContext()).toBeNull();
    state.user = { id: "u1" };
    expect(await getAdminContext()).toBeNull();
  });

  it("requireAdmin redirects to login when not an admin", async () => {
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login?next=/admin");
  });

  it("admin role passes every permission", async () => {
    state.user = { id: "a1" };
    state.adminRow = { role: "admin", permissions: [] };
    const ctx = await requirePerm("settings:write");
    expect(ctx.userId).toBe("a1");
    expect(can(ctx, "staff:write")).toBe(true);
  });

  it("staff passes only granted permissions", async () => {
    state.user = { id: "s1" };
    state.adminRow = { role: "staff", permissions: ["orders:write"] };
    await expect(requirePerm("orders:write")).resolves.toMatchObject({ role: "staff" });
    await expect(requirePerm("refunds:create")).rejects.toThrow("Forbidden: missing permission refunds:create");
  });

  it("checkPerm returns ok:false instead of throwing on refusal", async () => {
    state.user = { id: "s1" };
    state.adminRow = { role: "staff", permissions: ["orders:write"] };
    await expect(checkPerm("orders:write")).resolves.toMatchObject({ ok: true, ctx: { role: "staff" } });
    await expect(checkPerm("refunds:create")).resolves.toMatchObject({ ok: false, error: expect.stringContaining("refunds:create") });
  });
});
