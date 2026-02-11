// src/lib/quota.ts
export type Plan = "free" | "basic" | "advanced";

export type QuotaStatus = {
  signedIn: boolean;
  plan: Plan;
  monthKey: string;
  used: number;
  limit: number;
  remaining: number;
};

function getMonthKey() {
  // Use UTC month key to keep consistent with server-side month logic
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const LOCAL_KEY = "csnest_quota_v1";

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { monthKey: string; used: number };
  } catch {
    return null;
  }
}

function writeLocal(v: { monthKey: string; used: number }) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(v));
  } catch {
    // ignore
  }
}

export function getLocalQuota(limit: number): QuotaStatus {
  const monthKey = getMonthKey();
  const existing = readLocal();

  let used = 0;
  if (existing && existing.monthKey === monthKey) used = Number(existing.used ?? 0);

  used = Math.max(0, Math.floor(used));
  const remaining = Math.max(0, limit - used);

  return {
    signedIn: false,
    plan: "free",
    monthKey,
    used,
    limit,
    remaining,
  };
}

export function consumeLocalExport(limit: number) {
  const monthKey = getMonthKey();
  const existing = readLocal();

  let used = 0;
  if (existing && existing.monthKey === monthKey) used = Number(existing.used ?? 0);

  used = Math.max(0, Math.floor(used)) + 1;
  writeLocal({ monthKey, used });

  const remaining = Math.max(0, limit - used);
  return { monthKey, used, remaining, limit };
}

export function resetLocalQuota() {
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    // ignore
  }
}

export async function getQuota(): Promise<QuotaStatus> {
  try {
    const r = await fetch("/api/quota/status", { cache: "no-store" });
    const j = await r.json();

    // Signed out -> pure device quota
    if (!j?.signedIn) return getLocalQuota(3);

    const plan = (j?.plan ?? "free") as Plan;

    const serverUsed = Number(j?.used ?? 0);
    const serverLimit = Number(j?.limit ?? 3);

    // IMPORTANT:
    // Free plan stays device-limited even if signed in, otherwise users can dodge the device limit
    // by signing in/out (and it also causes UI mismatch).
    if (plan === "free") {
      const local = getLocalQuota(3);

      const used = Math.max(serverUsed, local.used);
      const limit = 3;
      const remaining = Math.max(0, limit - used);

      return {
        signedIn: true,
        plan: "free",
        monthKey: local.monthKey,
        used,
        limit,
        remaining,
      };
    }

    // Basic/Advanced -> server quota
    const remaining = Number(j?.remaining ?? Math.max(0, serverLimit - serverUsed));

    return {
      signedIn: true,
      plan,
      monthKey: String(j?.monthKey ?? getMonthKey()),
      used: serverUsed,
      limit: serverLimit,
      remaining: Math.max(0, remaining),
    };
  } catch {
    // If API fails, fallback to device quota (safe default)
    return getLocalQuota(3);
  }
}

export async function consumeExport() {
  // We always call getQuota first so we know if this export should use local vs server logic.
  const q = await getQuota();

  // Advanced should be unlimited and not consume anything
  if (q.plan === "advanced") return;

  // Free plan is device-limited even when signed in
  if (q.plan === "free") {
    const local = getLocalQuota(3);
    if (local.remaining <= 0) {
      throw new Error("Free tier limit reached (3 exports this month for this device).");
    }
  }

  // Signed-in non-advanced: consume server quota (basic uses server)
  if (q.signedIn && q.plan !== "free") {
    const r = await fetch("/api/quota/consume", { method: "POST" });
    const j = await r.json();
    if (!r.ok || !j?.ok) {
      throw new Error(j?.error || "Export quota exceeded");
    }
    return;
  }

  // Signed-in free OR signed-out: use local quota
  // Signed-in free: also consume local so UI and enforcement always match the banner
  const localConsume = consumeLocalExport(3);
  if (localConsume.remaining < 0) {
    throw new Error("Export quota exceeded");
  }
}
