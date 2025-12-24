export const LIMIT_PER_MONTH = 3;

// Shared in-memory store for BOTH routes (works in dev; not persistent on Vercel)
const mem = new Map<string, { monthKey: string; used: number }>();

function monthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function getQuotaForDevice(deviceId: string) {
  const key = monthKey();
  const state = mem.get(deviceId);

  if (!state || state.monthKey !== key) {
    mem.set(deviceId, { monthKey: key, used: 0 });
  }

  const cur = mem.get(deviceId)!;
  const remaining = Math.max(0, LIMIT_PER_MONTH - cur.used);

  return { monthKey: cur.monthKey, used: cur.used, remaining, limitPerMonth: LIMIT_PER_MONTH };
}

export function consumeQuotaForDevice(deviceId: string) {
  const q = getQuotaForDevice(deviceId);

  if (q.remaining <= 0) {
    // Don't change state; just return consistent data
    return { ok: false as const, ...q };
  }

  // increment
  const cur = mem.get(deviceId)!;
  cur.used += 1;
  mem.set(deviceId, cur);

  const next = getQuotaForDevice(deviceId);
  return { ok: true as const, ...next };
}
