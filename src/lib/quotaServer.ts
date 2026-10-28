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

// ── 24-hour passes ────────────────────────────────────────────────────────

// PostgREST reports a missing table as PGRST205 (or 42P01 from Postgres).
function isMissingTable(err: { code?: string } | null) {
  return err?.code === "PGRST205" || err?.code === "42P01";
}

/** End of the user's latest pass if it is still running, else null. */
export async function loadActivePassExpiry(
  admin: SupabaseClient,
  userId: string,
  now = new Date()
): Promise<string | null> {
  const { data, error } = await admin
    .from("export_passes")
    .select("expires_at")
    .eq("user_id", userId)
    .gt("expires_at", now.toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) return null;
    throw new Error(error.message || "Failed to load pass.");
  }
  return (data?.expires_at as string | undefined) ?? null;
}

/**
 * Record a paid pass. Idempotent per Checkout Session: a replayed webhook
 * leaves the existing row alone. A pass bought while another is running
 * starts when that one ends.
 */
export async function grantPass(
  admin: SupabaseClient,
  args: { userId: string; sessionId: string; hours: number },
  now = new Date()
): Promise<"granted" | "duplicate"> {
  const { data: existing, error: findErr } = await admin
    .from("export_passes")
    .select("id")
    .eq("stripe_session_id", args.sessionId)
    .maybeSingle();
  if (findErr) throw new Error(`Supabase lookup failed: ${findErr.message}`);
  if (existing) return "duplicate";

  const running = await loadActivePassExpiry(admin, args.userId, now);
  const start = running && new Date(running) > now ? new Date(running) : now;
  const end = new Date(start.getTime() + args.hours * 3600_000);

  const { error } = await admin.from("export_passes").insert({
    user_id: args.userId,
    stripe_session_id: args.sessionId,
    starts_at: start.toISOString(),
    expires_at: end.toISOString(),
  });
  if (error?.code === "23505") return "duplicate";
  if (error) throw new Error(`Supabase insert failed: ${error.message}`);
  return "granted";
}
