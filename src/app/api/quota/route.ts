// src/app/api/quota/route.ts
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
  // First day of current month at 00:00:00 UTC
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not signed in => free device experience (UX)
  if (!user) {
    const limits = getPlanLimits("free");
    return NextResponse.json({
      signedIn: false,
      plan: "free",
      status: "none",
      limit: limits.exportsPerMonth,
      used: 0,
      remaining: limits.exportsPerMonth,
      month: monthKey(),
    });
  }

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

  const { data: usageRow } = await admin
    .from("export_usage")
    .select("exports_used,period_start")
    .eq("user_id", user.id)
    .eq("period_start", periodStartIso)
    .maybeSingle();

  const used = Number(usageRow?.exports_used ?? 0);
  const remaining = Math.max(0, limit - used);

  return NextResponse.json({
    signedIn: true,
    plan: activePlan,
    status: sub?.status ?? "none",
    limit,
    used,
    remaining,
    month: monthKey(),
  });
}
