// src/app/api/quota/consume/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPlanLimits } from "@/lib/quota";

function monthKey(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthPeriodStartUTC(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { count?: number };
  const count = Math.max(1, Math.floor(body.count ?? 1));

  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("plan,status")
    .eq("user_id", user.id)
    .maybeSingle();

  const activePlan =
    sub?.status === "active"
      ? (sub.plan === "advanced" ? "advanced" : "basic")
      : "free";

  const limits = getPlanLimits(activePlan);
  const limit = limits.exportsPerMonth;

  const admin = createSupabaseAdminClient();

  const periodStart = monthPeriodStartUTC();
  const periodStartIso = periodStart.toISOString();

  const { data: existing } = await admin
    .from("export_usage")
    .select("exports_used")
    .eq("user_id", user.id)
    .eq("period_start", periodStartIso)
    .maybeSingle();

  const used = Number(existing?.exports_used ?? 0);
  const nextUsed = used + count;

  if (nextUsed > limit) {
    return NextResponse.json(
      {
        error: "Quota exceeded",
        limit,
        used,
        remaining: Math.max(0, limit - used),
        month: monthKey(),
      },
      { status: 402 }
    );
  }

  const { error: upsertErr } = await admin
    .from("export_usage")
    .upsert(
      {
        user_id: user.id,
        period_start: periodStartIso,
        exports_used: nextUsed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,period_start" }
    );

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    plan: activePlan,
    limit,
    used: nextUsed,
    remaining: Math.max(0, limit - nextUsed),
    month: monthKey(),
  });
}
