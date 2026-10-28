// Unit tests for the server quota helper (Supabase client is stubbed).
import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { consumeExports } from "@/lib/quotaServer";
import { getEffectivePlan, getPlanLimit } from "@/lib/plans";

type RpcResult = { data: unknown; error: { code?: string; message?: string } | null };

function stubAdmin(rpcResult: RpcResult, usedNow = 0) {
  const upsert = vi.fn(async () => ({ error: null }));
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: { exports_used: usedNow }, error: null }),
    upsert,
  };
  const admin = { rpc: vi.fn(async () => rpcResult), from: vi.fn(() => query) };
  return { admin: admin as unknown as SupabaseClient, upsert, rpc: admin.rpc };
}

const args = { userId: "u1", monthKey: "2026-10", amount: 1, limit: 3 };

describe("consumeExports", () => {
  it("returns the atomic function's result", async () => {
    const { admin, upsert } = stubAdmin({ data: [{ ok: true, exports_used: 2 }], error: null });
    await expect(consumeExports(admin, args)).resolves.toEqual({ ok: true, used: 2 });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("reports a rejected consume without writing", async () => {
    const { admin, upsert } = stubAdmin({ data: [{ ok: false, exports_used: 3 }], error: null });
    await expect(consumeExports(admin, args)).resolves.toEqual({ ok: false, used: 3 });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("falls back to read-then-write when the migration is not applied", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { admin, upsert } = stubAdmin({ data: null, error: { code: "PGRST202" } }, 1);
    await expect(consumeExports(admin, args)).resolves.toEqual({ ok: true, used: 2 });
    expect(upsert).toHaveBeenCalledOnce();
  });

  it("throws on other database errors", async () => {
    const { admin } = stubAdmin({ data: null, error: { code: "XX000", message: "boom" } });
    await expect(consumeExports(admin, args)).rejects.toThrow("boom");
  });
});

describe("plans", () => {
  it("only grants a paid plan while active", () => {
    expect(getEffectivePlan("basic", "active")).toBe("basic");
    expect(getEffectivePlan("advanced", "past_due")).toBe("free");
    expect(getEffectivePlan("bogus", "active")).toBe("free");
  });

  it("exposes limits per plan", () => {
    expect(getPlanLimit("free")).toEqual({ limit: 3, unlimited: false });
    expect(getPlanLimit("basic")).toEqual({ limit: 100, unlimited: false });
    expect(getPlanLimit("advanced").unlimited).toBe(true);
  });
});
