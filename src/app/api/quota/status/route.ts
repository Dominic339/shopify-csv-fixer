import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPlanLimits } from "@/lib/quota";

function monthPeriodStartUTC(d = new Date()) {
  // First day of current month at 00:00:00 UTC
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function isPaidStatus(status?: string | null) {
  // Treat trialing like paid so new subscriptions still get paid limits
  return status === "active" || status === "trialing";
}

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Anonymous users are always free
  if (!user) {
    const limits = getPlanLimits("free");
    return NextResponse.json({
      ok: true,
      signedIn: false,
      plan: "free",
      status: "none",
      exportsUsed: 0,
      limit: limits.exportsPerMonth,
    });
  }

  const { data: subRow } = await supabase
    .from("user_subscriptions")
    .select("plan,status,current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const plan = isPaidStatus(subRow?.status) ? (subRow?.plan as string) : "free";
  const limits = getPlanLimits(plan);

  // IMPORTANT: always read the usage row for the CURRENT month.
  // Using maybeSingle() without filtering can silently return an older row,
  // which makes exports look like they aren't being counted.
  const admin = createSupabaseAdminClient();
  const periodStartIso = monthPeriodStartUTC().toISOString();

  const { data: usageRow } = await admin
    .from("export_usage")
    .select("exports_used")
    .eq("user_id", user.id)
    .eq("period_start", periodStartIso)
    .maybeSingle();

  const exportsUsed = Number(usageRow?.exports_used ?? 0);

  return NextResponse.json({
    ok: true,
    signedIn: true,
    userId: user.id,
    plan,
    status: subRow?.status ?? "none",
    currentPeriodEnd: subRow?.current_period_end ?? null,
    exportsUsed,
    limit: limits.exportsPerMonth,
  });
}
