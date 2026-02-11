// src/lib/quota.ts

export type Plan = "free" | "basic" | "advanced";

export type QuotaStatus = {
  signedIn: boolean;
  plan: Plan;
  monthKey: string;
  used: number;
  limit: number;
  remaining: number;
  unlimited?: boolean;
};

export function getPlanLimits(plan: Plan) {
  if (plan === "advanced") return { exportsPerMonth: 999999, unlimited: true };
  if (plan === "basic") return { exportsPerMonth: 50, unlimited: false };
  return { exportsPerMonth: 3, unlimited: false };
}

function storageKeyForMonth(monthKey: string) {
  return `csnest_quota_${monthKey}`;
}

function getMonthKeyUtc(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function readLocalUsed(monthKey: string) {
  try {
    const raw = localStorage.getItem(storageKeyForMonth(monthKey));
    const n = Number(raw ?? "0");
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  } catch {
    return 0;
  }
}

function writeLocalUsed(monthKey: string, used: number) {
  try {
    localStorage.setItem(storageKeyForMonth(monthKey), String(Math.max(0, used)));
  } catch {
    // ignore
  }
}

function localStatus(plan: Plan): QuotaStatus {
  const monthKey = getMonthKeyUtc();
  const limits = getPlanLimits(plan);
  const used = readLocalUsed(monthKey);
  const limit = limits.exportsPerMonth;
  const remaining = Math.max(0, limit - used);
  return {
    signedIn: false,
    plan,
    monthKey,
    used,
    limit,
    remaining,
    unlimited: limits.unlimited,
  };
}

export async function getQuota(): Promise<QuotaStatus> {
  try {
    const r = await fetch("/api/quota/status", { cache: "no-store" });
    if (!r.ok) return localStatus("free");
    const data = (await r.json()) as QuotaStatus;
    // If server says not signed in, we still want the local device limit.
    if (!data?.signedIn) return localStatus("free");
    return data;
  } catch {
    return localStatus("free");
  }
}

export async function consumeExport(amount = 1): Promise<QuotaStatus> {
  // Attempt server first (signed-in users)
  try {
    const r = await fetch("/api/quota/consume", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount }),
    });

    if (r.ok) {
      return (await r.json()) as QuotaStatus;
    }

    // If not signed in (401), fall back to local device tracking.
    if (r.status === 401) {
      const monthKey = getMonthKeyUtc();
      const plan: Plan = "free";
      const limits = getPlanLimits(plan);
      const used = readLocalUsed(monthKey);
      const nextUsed = used + Math.max(1, Math.min(10, Number(amount || 1)));
      if (!limits.unlimited && nextUsed > limits.exportsPerMonth) {
        throw new Error(`Free tier limit reached (${limits.exportsPerMonth} exports this month for this device).`);
      }
      writeLocalUsed(monthKey, nextUsed);
      return localStatus(plan);
    }

    // 403 from server means real quota exceeded
    const err = await r.json().catch(() => null);
    throw new Error(err?.message ?? "Monthly export limit reached.");
  } catch (e) {
    // If network/server fails, be conservative and use local device tracking.
    const monthKey = getMonthKeyUtc();
    const plan: Plan = "free";
    const limits = getPlanLimits(plan);
    const used = readLocalUsed(monthKey);
    const nextUsed = used + Math.max(1, Math.min(10, Number(amount || 1)));
    if (!limits.unlimited && nextUsed > limits.exportsPerMonth) {
      throw new Error(`Free tier limit reached (${limits.exportsPerMonth} exports this month for this device).`);
    }
    writeLocalUsed(monthKey, nextUsed);
    return localStatus(plan);
  }
}
