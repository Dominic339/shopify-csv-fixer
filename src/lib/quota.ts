import { getMonthKey } from "@/lib/month";
import { FREE_EXPORTS_PER_MONTH, exportCountsTowardLimit, getPlanLimit, type Plan } from "@/lib/plans";

const KEY = "striveformats_free_quota_v1";

type LocalQuotaState = {
  monthKey: string; // YYYY-MM
  used: number;
};

export type { Plan };

export type PlanLimits = {
  exportsPerMonth: number;
  unlimited?: boolean;
};

export function getPlanLimits(plan: string): PlanLimits {
  const { limit, unlimited } = getPlanLimit(plan);
  return unlimited ? { exportsPerMonth: 0, unlimited: true } : { exportsPerMonth: limit };
}

function getLocalQuota(limitPerMonth = FREE_EXPORTS_PER_MONTH) {
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
    passExpiresAt: null as string | null,
  };
}

function consumeLocalExport(limitPerMonth = FREE_EXPORTS_PER_MONTH) {
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
        limit: FREE_EXPORTS_PER_MONTH,
        remaining: FREE_EXPORTS_PER_MONTH,
        signedIn: false,
        plan: "free" as Plan,
        monthKey: getMonthKey(),
        unlimited: false,
        passExpiresAt: null as string | null,
      };
    }
    const j = await r.json();
    return {
      signedIn: Boolean(j?.signedIn),
      plan: (j?.plan ?? "free") as Plan,
      monthKey: String(j?.monthKey ?? getMonthKey()),
      used: Number(j?.used ?? 0),
      limit: Number(j?.limit ?? FREE_EXPORTS_PER_MONTH),
      remaining: Number(j?.remaining ?? FREE_EXPORTS_PER_MONTH),
      unlimited: Boolean(j?.unlimited ?? false),
      passExpiresAt: (j?.passExpiresAt ?? null) as string | null,
    };
  }

  // browser: prefer API, fallback to local ONLY if not signed in / error
  try {
    const r = await fetch("/api/quota/status", { cache: "no-store" });
    if (!r.ok) return getLocalQuota();

    const j = await r.json();

    if (!j?.signedIn) return getLocalQuota();

    return {
      signedIn: true as const,
      plan: (j?.plan ?? "free") as Plan,
      monthKey: String(j?.monthKey ?? getMonthKey()),
      used: Number(j?.used ?? 0),
      limit: Number(j?.limit ?? getPlanLimits(j?.plan ?? "free").exportsPerMonth),
      remaining: Number(j?.remaining ?? 0),
      unlimited: Boolean(j?.unlimited ?? false),
      passExpiresAt: (j?.passExpiresAt ?? null) as string | null,
    };
  } catch {
    return getLocalQuota();
  }
}

/** Count one export of `rows` data rows. Small files are always free. */
export async function consumeExport(rows = Infinity): Promise<void> {
  if (!exportCountsTowardLimit(rows)) return;

  const q = await getQuota();

  // Advanced or a running pass => unlimited
  if (q?.signedIn && q?.unlimited) return;

  let r: Response;
  try {
    r = await fetch("/api/quota/consume", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: 1 }),
    });
  } catch {
    // Offline / network failure: fall back to the device allowance.
    return consumeLocalOrThrow();
  }

  // Not signed in: use the local free quota (no sign-up required to try the tool).
  if (r.status === 401) return consumeLocalOrThrow();

  if (r.ok) return;

  const j = await r.json().catch(() => ({}));

  // A server-side limit is authoritative for signed-in users; never top it up
  // from the device allowance.
  if (r.status === 403) throw new Error(j?.message ?? "Monthly export limit reached.");

  // Server error: don't block the user on our own outage.
  return consumeLocalOrThrow();
}

function consumeLocalOrThrow() {
  const local = consumeLocalExport();
  if (!local.ok) {
    throw new Error(`Free tier limit reached (${FREE_EXPORTS_PER_MONTH} exports this month for this device).`);
  }
}
