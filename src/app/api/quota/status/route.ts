import { NextResponse } from "next/server";
import { getMonthKey } from "@/lib/month";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Plan = "free" | "basic" | "advanced";

function getPlanLimit(plan: Plan) {
  if (plan === "advanced") return { unlimited: true as const, limit: 0 };
  if (plan === "basic") return { unlimited: false as const, limit: 100 };
  return { unlimited: false as const, limit: 3 };
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      signedIn: false,
      plan: "free",
      unlimited: false,
      monthKey: getMonthKey(),
      used: 0,
      limit: 3,
      remaining: 3,
    });
  }

  const admin = createSupabaseAdminClient();
  const monthKey = getMonthKey();

  const { data: subRow } = await admin
    .from("user_subscriptions")
    .select("plan,status")
    .eq("user_id", user.id)
    .maybeSingle();

  const status = String(subRow?.status ?? "").toLowerCase();
  const rawPlan = String(subRow?.plan ?? "free").toLowerCase();
  const plan: Plan = rawPlan === "advanced" ? "advanced" : rawPlan === "basic" ? "basic" : "free";

  // Only treat as paid if status is active
  const effectivePlan: Plan = status === "active" ? plan : "free";
  const { unlimited, limit } = getPlanLimit(effectivePlan);

  if (unlimited) {
    return NextResponse.json({
      signedIn: true,
      plan: effectivePlan,
      unlimited: true,
      monthKey,
      used: 0,
      limit: 0,
      remaining: 0,
    });
  }

  const { data: usageRow } = await admin
    .from("export_usage")
    .select("exports_used")
    .eq("user_id", user.id)
    .eq("month_key", monthKey)
    .maybeSingle();

  const used = Number(usageRow?.exports_used ?? 0);
  const remaining = Math.max(0, limit - used);

  return NextResponse.json({
    signedIn: true,
    plan: effectivePlan,
    unlimited: false,
    monthKey,
    used,
    limit,
    remaining,
  });
}
