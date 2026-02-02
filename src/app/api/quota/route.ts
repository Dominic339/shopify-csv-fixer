// src/app/api/quota/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function monthKey(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function planLimit(plan: "free" | "basic" | "advanced") {
  if (plan === "basic") return 100;
  if (plan === "advanced") return 1000;
  return 3;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not signed in => treat as free (local-only UX)
  if (!user) {
    return NextResponse.json({
      signedIn: false,
      plan: "free",
      status: "none",
      limit: planLimit("free"),
      used: 0,
      remaining: planLimit("free"),
      month: monthKey(),
    });
  }

  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("plan,status")
    .eq("user_id", user.id)
    .maybeSingle();

  const activePlan: "free" | "basic" | "advanced" =
    sub?.status === "active"
      ? (sub.plan === "advanced" ? "advanced" : "basic")
      : "free";

  const limit = planLimit(activePlan);

  // use admin to avoid RLS headaches
  const admin = createSupabaseAdminClient();
  const month = monthKey();

  const { data: usageRow } = await admin
    .from("export_usage")
    .select("used")
    .eq("user_id", user.id)
    .eq("month", month)
    .maybeSingle();

  const used = Number(usageRow?.used ?? 0);
  const remaining = Math.max(0, limit - used);

  return NextResponse.json({
    signedIn: true,
    plan: activePlan,
    status: sub?.status ?? "none",
    limit,
    used,
    remaining,
    month,
  });
}
