import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPlanLimits } from "@/lib/quota";
import { getMonthKey } from "@/lib/month";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Treat signed-out users as free plan (UI can still render)
    const plan = "free";
    const limit = getPlanLimits(plan).exportsPerMonth;
    return NextResponse.json({
      monthKey: getMonthKey(),
      used: 0,
      limit,
      remaining: limit,
      plan,
    });
  }

  const admin = createSupabaseAdminClient();
  const monthKey = getMonthKey();

  // Determine effective plan (active subscription -> plan else free)
  const { data: subRow } = await admin
    .from("user_subscriptions")
    .select("plan,status")
    .eq("user_id", user.id)
    .maybeSingle();

  const rawPlan = (subRow?.plan || "free").toString().toLowerCase();
  const rawStatus = (subRow?.status || "none").toString().toLowerCase();
  const plan = rawStatus === "active" ? rawPlan : "free";
  const limit = getPlanLimits(plan).exportsPerMonth;

  const { data: usageRow } = await admin
    .from("export_usage")
    .select("exports_used")
    .eq("user_id", user.id)
    .eq("month_key", monthKey)
    .maybeSingle();

  const used = Number(usageRow?.exports_used || 0);

  return NextResponse.json({
    monthKey,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    plan,
  });
}
