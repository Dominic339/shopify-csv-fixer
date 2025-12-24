import { NextResponse } from "next/server";
import { consumeQuotaForDevice } from "@/lib/serverQuotaStore";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const deviceId = String(body.deviceId ?? "");
  if (!deviceId) {
    return NextResponse.json({ ok: false, error: "missing_device_id" }, { status: 400 });
  }

  const result = consumeQuotaForDevice(deviceId);

  // Always return the quota numbers so the UI can update immediately
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "quota_exceeded",
        limitPerMonth: result.limitPerMonth,
        used: result.used,
        remaining: result.remaining,
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    ok: true,
    limitPerMonth: result.limitPerMonth,
    used: result.used,
    remaining: result.remaining,
  });
}
