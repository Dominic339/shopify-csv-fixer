import { getMonthKey } from "@/lib/month";

const KEY = "csnest_free_quota_v1";

type LocalQuotaState = {
  monthKey: string; // YYYY-MM
  used: number;
};

export type Plan = "free" | "basic" | "advanced";

export type PlanLimits = {
  exportsPerMonth: number;
  unlimited?: boolean;
};

export function getPlanLimits(plan: string): PlanLimits {
  const p = (plan || "free").toLowerCase();
  if (p === "advanced") return { exportsPerMonth: 0, unlimited: true };
  if (p === "basic") return { exportsPerMonth: 100 };
  return { exportsPerMonth: 3 };
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
    unlimited: false as const,
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
  // server render: try API, but never rely on localStorage
  if (typeof window === "undefined") {
    const r = await fetch("/api/quota/status", { cache: "no-store" }).catch(() => null);
    if (!r || !r.ok) {
      return {
        used: 0,
        limit: 3,
        remaining: 3,
        signedIn: false,
        plan: "free" as Plan,
        monthKey: getMonthKey(),
        unlimited: false,
      };
    }
    const j = await r.json();
    return {
      signedIn: Boolean(j?.signedIn),
      plan: (j?.plan ?? "free") as Plan,
      monthKey: String(j?.monthKey ?? getMonthKey()),
      used: Number(j?.used ?? 0),
      limit: Number(j?.limit ?? 3),
      remaining: Number(j?.remaining ?? 3),
      unlimited: Boolean(j?.unlimited ?? false),
    };
  }

  // browser: prefer API, fallback to local ONLY if not signed in / error
  try {
    const r = await fetch("/api/quota/status", { cache: "no-store" });
    if (!r.ok) return getLocalQuota(3);

    const j = await r.json();

    if (!j?.signedIn) return getLocalQuota(3);

    return {
      signedIn: true as const,
      plan: (j?.plan ?? "free") as Plan,
      monthKey: String(j?.monthKey ?? getMonthKey()),
      used: Number(j?.used ?? 0),
      limit: Number(j?.limit ?? getPlanLimits(j?.plan ?? "free").exportsPerMonth),
      remaining: Number(j?.remaining ?? 0),
      unlimited: Boolean(j?.unlimited ?? false),
    };
  } catch {
    return getLocalQuota(3);
  }
}

export async function consumeExport(): Promise<void> {
  const q = await getQuota();

  // signed in + advanced => unlimited
  if (q?.signedIn && q?.plan === "advanced") return;

  try {
    const r = await fetch("/api/quota/consume", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: 1 }),
    });

    // If not signed in, use local free quota
    if (r.status === 401) {
      const local = consumeLocalExport(3);
      if (!local.ok) throw new Error("Free tier limit reached (3 exports this month for this device).");
      return;
    }

    const j = await r.json().catch(() => ({}));

    if (!r.ok) throw new Error(j?.message ?? "Monthly export limit reached.");
    return;
  } catch {
    const local = consumeLocalExport(3);
    if (!local.ok) throw new Error("Free tier limit reached (3 exports this month for this device).");
  }
}
