// src/lib/quota.ts
import { getMonthKey } from "@/lib/month";

const KEY = "csnest_free_quota_v1";

type LocalQuotaState = {
  monthKey: string; // YYYY-MM
  used: number;
};

export type Plan = "free" | "basic" | "advanced";

export type PlanLimits = {
  exportsPerMonth: number;
};

export function getPlanLimits(plan: string): PlanLimits {
  const p = (plan || "free").toLowerCase();

  // Advanced: effectively unlimited (keeps things numeric + simple)
  if (p === "advanced") return { exportsPerMonth: 1000000 };

  if (p === "basic") return { exportsPerMonth: 100 };

  return { exportsPerMonth: 3 };
}

/**
 * FREE (not signed in) per-device monthly quota in localStorage.
 * Resets automatically when monthKey changes (1st of month in UTC).
 */
function getLocalQuota(limitPerMonth = 3) {
  const key = getMonthKey();
  const raw = typeof window === "undefined" ? null : window.localStorage.getItem(KEY);

  let state: LocalQuotaState = { monthKey: key, used: 0 };

  if (raw) {
    try {
      state = JSON.parse(raw) as LocalQuotaState;
    } catch {
      state = { monthKey: key, used: 0 };
    }
  }

  if (state.monthKey !== key) {
    state = { monthKey: key, used: 0 };
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(state));
  }

  const remaining = Math.max(0, limitPerMonth - state.used);

  return { signedIn: false as const, plan: "free" as const, monthKey: state.monthKey, used: state.used, limit: limitPerMonth, remaining };
}

function consumeLocalExport(limitPerMonth = 3) {
  const q = getLocalQuota(limitPerMonth);

  if (q.remaining <= 0) {
    return { ok: false as const, ...q };
  }

  const next: LocalQuotaState = { monthKey: q.monthKey, used: q.used + 1 };
  window.localStorage.setItem(KEY, JSON.stringify(next));

  const after = getLocalQuota(limitPerMonth);
  return { ok: true as const, ...after };
}

/**
 * Unified quota getter:
 * - Signed-in users: reads server usage from /api/quota (Supabase export_usage)
 * - Not signed-in users: reads localStorage (3/month per device)
 *
 * Shape matches what AppClient expects (quota.used).
 */
export async function getQuota() {
  // If we’re in SSR or no window, just call the API (it will return signedIn false for anon)
  if (typeof window === "undefined") {
    const r = await fetch("/api/quota", { cache: "no-store" }).catch(() => null);
    if (!r || !r.ok) return { used: 0, limit: 3, remaining: 3, signedIn: false, plan: "free", monthKey: getMonthKey() };
    const j = await r.json();
    return {
      signedIn: Boolean(j?.signedIn),
      plan: (j?.plan ?? "free") as Plan,
      monthKey: String(j?.month ?? getMonthKey()),
      used: Number(j?.used ?? 0),
      limit: Number(j?.limit ?? 3),
      remaining: Number(j?.remaining ?? 3),
    };
  }

  // First try server (this tells us if user is signed in)
  try {
    const r = await fetch("/api/quota", { cache: "no-store" });
    if (!r.ok) {
      // fallback to local
      return getLocalQuota(3);
    }

    const j = await r.json();

    if (!j?.signedIn) {
      // Option A: per-device local quota
      return getLocalQuota(3);
    }

    return {
      signedIn: true as const,
      plan: (j?.plan ?? "free") as Plan,
      monthKey: String(j?.month ?? getMonthKey()),
      used: Number(j?.used ?? 0),
      limit: Number(j?.limit ?? getPlanLimits(j?.plan ?? "free").exportsPerMonth),
      remaining: Number(j?.remaining ?? 0),
    };
  } catch {
    return getLocalQuota(3);
  }
}

/**
 * Consume one export:
 * - Signed-in user: POST /api/quota to increment Supabase export_usage
 * - Not signed in: localStorage per-device (3/month)
 *
 * Throws an Error when the user is out of quota.
 */
export async function consumeExport(): Promise<void> {
  // Try server first
  try {
    const r = await fetch("/api/quota", { method: "POST" });

    // Not signed in => local path
    if (r.status === 401) {
      const local = consumeLocalExport(3);
      if (!local.ok) throw new Error("Free tier limit reached (3 exports this month for this device).");
      return;
    }

    const j = await r.json().catch(() => ({}));

    if (!r.ok) {
      throw new Error(j?.message ?? "Monthly export limit reached.");
    }

    // ok
    return;
  } catch {
    // If server errors for any reason, use local quota as a safe fallback
    const local = consumeLocalExport(3);
    if (!local.ok) throw new Error("Free tier limit reached (3 exports this month for this device).");
  }
}
