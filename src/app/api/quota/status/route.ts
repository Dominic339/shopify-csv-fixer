import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPlanLimits } from "@/lib/quota";
import { getMonthKey } from "@/lib/month";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not signed in → free plan
  if (!user) {
    const limits = getPlanLimits("free");
    return NextResponse.json({
      ok: true,
      signedIn: false,
      plan: "free",
      exportsUsed: 0,
      limit: limits.exportsPerMonth,
    });
  }

  // Subscription
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("plan,status")
    .eq("user_id", user.id)
    .maybeSingle();

  const plan =
    sub?.status === "active" ? (sub.plan as "basic" | "advanced") : "free";

  const limits = getPlanLimits(plan);
  const monthKey = getMonthKey();

  const admin = createSupabaseAdminClient();

  const { data: usage } = await admin
    .from("export_usage")
    .select("exports_used")
    .eq("user_id", user.id)
    .eq("month_key", monthKey)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    signedIn: true,
    plan,
    exportsUsed: usage?.exports_used ?? 0,
    limit: limits.exportsPerMonth,
    monthKey,
  });
}
