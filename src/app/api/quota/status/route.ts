import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPlanLimits } from "@/lib/quota";

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

  const plan = subRow?.status === "active" ? (subRow.plan as string) : "free";
  const limits = getPlanLimits(plan);

  const { data: usageRow } = await supabase
    .from("export_usage")
    .select("exports_used,period_start")
    .eq("user_id", user.id)
    .maybeSingle();

  const now = new Date();
  const periodStart = usageRow?.period_start ? new Date(usageRow.period_start) : now;
  const isSameMonth =
    periodStart.getUTCFullYear() === now.getUTCFullYear() &&
    periodStart.getUTCMonth() === now.getUTCMonth();

  const exportsUsed = isSameMonth ? usageRow?.exports_used ?? 0 : 0;

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
