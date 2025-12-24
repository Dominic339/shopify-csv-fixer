import { NextResponse } from "next/server";
import { getQuotaForDevice } from "@/lib/serverQuotaStore";

// For now we stub this with a simple in-memory map.
// (Works locally, but resets on Vercel redeploy — next step is adding a DB.)
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

  const q = getQuotaForDevice(deviceId);
  return NextResponse.json({
    ok: true,
    limitPerMonth: q.limitPerMonth,
    used: q.used,
    remaining: q.remaining,
  });
}