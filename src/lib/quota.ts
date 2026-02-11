import { getMonthKey } from "@/lib/month";

const KEY = "csnest_free_quota_v1";

type LocalQuotaState = {
  monthKey: string; // YYYY-MM
  used: number;
};

export type Plan = "free" | "basic" | "advanced";

export type PlanLimits = {
  // When unlimited is true, exportsPerMonth is only a UI fallback.
  // (We keep it numeric so existing math doesn't crash.)
  exportsPerMonth: number;
  unlimited?: boolean;
};

export function getPlanLimits(plan: string): PlanLimits {
  const p = (plan || "free").toLowerCase();
  // Advanced is truly unlimited.
  if (p === "advanced") return { exportsPerMonth: 0, unlimited: true };
  if (p === "basic") return { exportsPerMonth: 100 };
  return { exportsPerMonth: 3 };
}

type AuthStatus = {
  signedIn: boolean;
  plan: Plan;
  status?: string;
};

async function fetchAuthStatus(): Promise<AuthStatus> {
  try {
    const r = await fetch("/api/subscription/status", { cache: "no-store" });
    if (!r.ok) return { signedIn: false, plan: "free" };
    const j = await r.json().catch(() => ({}));
    return {
      signedIn: Boolean(j?.signedIn),
      plan: (j?.plan ?? "free") as Plan,
      status: typeof j?.status === "string" ? j.status : undefined,
    };
  } catch {
    return { signedIn: false, plan: "free" };
  }
}

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

  return {
    signedIn: false as const,
    plan: "free" as const,
    monthKey: state.monthKey,
    used: state.used,
    limit: limitPerMonth,
    remaining,
  };
}

function consumeLocalExport(limitPerMonth = 3) {
  const q = getLocalQuota(limitPerMonth);

  if (q.remaining <= 0) return { ok: false as const, ...q };

  const next: LocalQuotaState = { monthKey: q.monthKey, used: q.used + 1 };
  window.localStorage.setItem(KEY, JSON.stringify(next));

  const after = getLocalQuota(limitPerMonth);
  return { ok: true as const, ...after };
}

export async function getQuota() {
  // Server side always relies on API (no localStorage)
  if (typeof window === "undefined") {
    const r = await fetch("/api/quota/status", { cache: "no-store" }).catch(() => null);
    if (!r || !r.ok)
      return {
        used: 0,
        limit: 3,
        remaining: 3,
        signedIn: false,
        plan: "free",
        monthKey: getMonthKey(),
      };

    const j = await r.json();
    return {
      signedIn: Boolean(j?.signedIn),
      plan: (j?.plan ?? "free") as Plan,
      monthKey: String(j?.monthKey ?? getMonthKey()),
      used: Number(j?.used ?? 0),
      limit: Number(j?.limit ?? getPlanLimits(j?.plan ?? "free").exportsPerMonth),
      remaining: Number(j?.remaining ?? 0),
      unlimited: Boolean(j?.unlimited ?? false),
    };
  }

  // Client side: decide local vs server based on "are we signed in?"
  const auth = await fetchAuthStatus();

  // If not signed in, use local device quota (free only)
  if (!auth.signedIn) return getLocalQuota(3);

  // Signed in: do NOT use local quota at all
  // Advanced: treat as unlimited even if quota endpoint lags behind
  if (auth.plan === "advanced") {
    return {
      signedIn: true as const,
      plan: "advanced" as const,
      monthKey: getMonthKey(),
      used: 0,
      limit: 0,
      remaining: 0,
      unlimited: true as const,
    };
  }

  try {
    const r = await fetch("/api/quota/status", { cache: "no-store" });
    if (!r.ok) {
      const limits = getPlanLimits(auth.plan);
      return {
        signedIn: true as const,
        plan: auth.plan,
        monthKey: getMonthKey(),
        used: 0,
        limit: limits.exportsPerMonth,
        remaining: limits.exportsPerMonth,
        unlimited: Boolean(limits.unlimited ?? false),
      };
    }

    const j = await r.json().catch(() => ({}));
    const plan = (j?.plan ?? auth.plan ?? "free") as Plan;
    const limits = getPlanLimits(plan);

    // If the quota endpoint ever claims "not signed in" but auth says signed in,
    // trust auth and keep signedIn true so we never fall back to local for signed users.
    const signedIn = true as const;

    return {
      signedIn,
      plan,
      monthKey: String(j?.monthKey ?? getMonthKey()),
      used: Number(j?.used ?? 0),
      limit: Number(j?.limit ?? limits.exportsPerMonth),
      remaining: Number(j?.remaining ?? Math.max(0, limits.exportsPerMonth - Number(j?.used ?? 0))),
      unlimited: Boolean(j?.unlimited ?? limits.unlimited ?? false),
    };
  } catch {
    const limits = getPlanLimits(auth.plan);
    return {
      signedIn: true as const,
      plan: auth.plan,
      monthKey: getMonthKey(),
      used: 0,
      limit: limits.exportsPerMonth,
      remaining: limits.exportsPerMonth,
      unlimited: Boolean(limits.unlimited ?? false),
    };
  }
}

export async function consumeExport(): Promise<void> {
  // Decide behavior from subscription status first so "advanced" never gets blocked
  const auth = await fetchAuthStatus();

  // Not signed in: local free quota only
  if (!auth.signedIn) {
    const local = consumeLocalExport(3);
    if (!local.ok) throw new Error("Free tier limit reached (3 exports this month for this device).");
    return;
  }

  // Signed in: advanced is unlimited
  if (auth.plan === "advanced") return;

  // Signed in: basic or free is enforced by server
  const r = await fetch("/api/quota/consume", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ amount: 1 }),
  });

  // If the server says 401 but auth says signed in, don't fall back to local.
  // That would incorrectly show the free device limit for paid users.
  if (r.status === 401) {
    throw new Error("Session not recognized by the server. Please sign out and sign back in.");
  }

  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.message ?? "Monthly export limit reached.");
}
