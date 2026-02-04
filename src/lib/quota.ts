export type Plan = "free" | "basic" | "advanced";

export type PlanLimits = {
  exportsPerMonth: number;
};

export type QuotaStatus = {
  monthKey: string; // YYYY-MM
  used: number;
  limit: number;
  remaining: number;
  plan: Plan;
};

export type ConsumeResult =
  | (QuotaStatus & { ok: true })
  | (QuotaStatus & { ok: false; message: string });

function currentMonthKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function getPlanLimits(plan: Plan | string): PlanLimits {
  const p = (plan || "free").toString().toLowerCase() as Plan;
  if (p === "advanced") return { exportsPerMonth: 1000 };
  if (p === "basic") return { exportsPerMonth: 100 };
  return { exportsPerMonth: 3 };
}

function asPlan(value: unknown): Plan {
  const v = (value ?? "free").toString().toLowerCase();
  if (v === "advanced") return "advanced";
  if (v === "basic") return "basic";
  return "free";
}

/**
 * Server-backed quota status (Supabase table: export_usage)
 * Falls back to a safe local default if the API is unavailable.
 */
export async function getQuota(): Promise<QuotaStatus> {
  try {
    const res = await fetch("/api/quota/status", { cache: "no-store" });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as any;

    const plan = asPlan(data?.plan);
    const used = Number(data?.used ?? 0);
    const limit = Number(data?.limit ?? getPlanLimits(plan).exportsPerMonth);

    return {
      monthKey: String(data?.monthKey ?? currentMonthKey()),
      plan,
      used,
      limit,
      remaining: Math.max(0, limit - used),
    };
  } catch {
    const plan: Plan = "free";
    const limit = getPlanLimits(plan).exportsPerMonth;
    return { monthKey: currentMonthKey(), plan, used: 0, limit, remaining: limit };
  }
}

/**
 * Consume one export. Call this right before generating/downloading the CSV.
 * Returns ok=false if the user is out of quota or not signed in.
 */
export async function consumeExport(): Promise<ConsumeResult> {
  const fallback = await getQuota();

  try {
    const res = await fetch("/api/quota/consume", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: 1 }),
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const message =
        (data && (data.message || data.error)) ||
        (res.status === 401 ? "Please sign in to export." : "Failed to record export usage.");
      return { ...fallback, ok: false, message };
    }

    const plan = asPlan(data?.plan);
    const used = Number(data?.used ?? 0);
    const limit = Number(data?.limit ?? getPlanLimits(plan).exportsPerMonth);

    return {
      ok: Boolean(data?.ok ?? true),
      monthKey: String(data?.monthKey ?? currentMonthKey()),
      plan,
      used,
      limit,
      remaining: Math.max(0, limit - used),
    } as ConsumeResult;
  } catch {
    return { ...fallback, ok: false, message: "Failed to record export usage." };
  }
}
