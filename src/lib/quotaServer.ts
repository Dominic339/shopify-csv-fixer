// src/lib/quotaServer.ts
// Server-only helpers for signed-in export quota (Supabase-backed).

import type { SupabaseClient } from "@supabase/supabase-js";
import { getEffectivePlan, type Plan } from "@/lib/plans";

export async function loadEffectivePlan(admin: SupabaseClient, userId: string): Promise<Plan> {
  const { data, error } = await admin
    .from("user_subscriptions")
    .select("plan,status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message || "Failed to load subscription.");
  return getEffectivePlan(data?.plan, data?.status);
}

export async function loadExportsUsed(
  admin: SupabaseClient,
  userId: string,
  monthKey: string
): Promise<number> {
  const { data, error } = await admin
    .from("export_usage")
    .select("exports_used")
    .eq("user_id", userId)
    .eq("month_key", monthKey)
    .maybeSingle();

  if (error) throw new Error(error.message || "Failed to read usage.");
  return Number(data?.exports_used ?? 0);
}

export type ConsumeResult = { ok: boolean; used: number };

// PostgREST reports a missing function as PGRST202 (or 42883 from Postgres).
function isMissingFunction(err: { code?: string } | null) {
  return err?.code === "PGRST202" || err?.code === "42883";
}

/**
 * Atomically add `amount` exports for the month if it stays within `limit`.
 *
 * Uses the `consume_exports` Postgres function (supabase/migrations) so that
 * concurrent requests cannot both pass the limit check. If the migration has
 * not been applied yet, falls back to the previous read-then-write behaviour.
 */
export async function consumeExports(
  admin: SupabaseClient,
  args: { userId: string; monthKey: string; amount: number; limit: number }
): Promise<ConsumeResult> {
  const { data, error } = await admin.rpc("consume_exports", {
    p_user_id: args.userId,
    p_month_key: args.monthKey,
    p_amount: args.amount,
    p_limit: args.limit,
  });

  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;
    return { ok: Boolean(row?.ok), used: Number(row?.exports_used ?? 0) };
  }

  if (!isMissingFunction(error)) {
    throw new Error(error.message || "Failed to update usage.");
  }

  console.warn("consume_exports function missing; apply supabase/migrations. Using non-atomic fallback.");

  const used = await loadExportsUsed(admin, args.userId, args.monthKey);
  const nextUsed = used + args.amount;
  if (nextUsed > args.limit) return { ok: false, used };

  const { error: upErr } = await admin
    .from("export_usage")
    .upsert(
      { user_id: args.userId, month_key: args.monthKey, exports_used: nextUsed },
      { onConflict: "user_id,month_key" }
    );
  if (upErr) throw new Error(upErr.message || "Failed to update usage.");

  return { ok: true, used: nextUsed };
}
