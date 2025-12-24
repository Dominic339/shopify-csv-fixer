import { NextResponse } from "next/server";

const LIMIT_PER_MONTH = 3;
const mem = new Map<string, { monthKey: string; used: number }>();

function monthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const deviceId = String(body.deviceId ?? "");

  if (!deviceId) {
    return NextResponse.json({ ok: false, error: "missing_device_id" }, { status: 400 });
  }

  const key = monthKey();
  const state = mem.get(deviceId);

  if (!state || state.monthKey !== key) {
    mem.set(deviceId, { monthKey: key, used: 0 });
  }

  const cur = mem.get(deviceId)!;
  const remainingBefore = Math.max(0, LIMIT_PER_MONTH - cur.used);

  if (remainingBefore <= 0) {
    return NextResponse.json(
      { ok: false, error: "quota_exceeded", limitPerMonth: LIMIT_PER_MONTH, used: cur.used, remaining: 0 },
      { status: 403 }
    );
  }

  cur.used += 1;
  mem.set(deviceId, cur);

  const remaining = Math.max(0, LIMIT_PER_MONTH - cur.used);

  return NextResponse.json({
    ok: true,
    limitPerMonth: LIMIT_PER_MONTH,
    used: cur.used,
    remaining,
  });
}
