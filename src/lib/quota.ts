const KEY = "scf_quota_v1";

type QuotaState = {
  monthKey: string; // YYYY-MM
  exportsUsed: number;
};

function monthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function getQuota(limitPerMonth = 3) {
  const key = monthKey();
  const raw = typeof window === "undefined" ? null : window.localStorage.getItem(KEY);

  let state: QuotaState = { monthKey: key, exportsUsed: 0 };

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as QuotaState;
      state = parsed;
    } catch {}
  }

  if (state.monthKey !== key) {
    state = { monthKey: key, exportsUsed: 0 };
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(state));
  }

  const remaining = Math.max(0, limitPerMonth - state.exportsUsed);

  return { ...state, remaining, limitPerMonth };
}

export function consumeExport() {
  const q = getQuota();
  const next = { monthKey: q.monthKey, exportsUsed: q.exportsUsed + 1 };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return getQuota();
}

export function getPlanLimits(plan: string) {
  const p = (plan || "free").toLowerCase();

  if (p === "advanced") {
    return { exportsPerMonth: 1000 };
  }
  if (p === "basic") {
    return { exportsPerMonth: 100 };
  }
  return { exportsPerMonth: 3 };
}
