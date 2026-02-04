import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function monthKey(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mk = monthKey();

  if (!user) {
    // Anonymous users are tracked client-side (localStorage)
    return NextResponse.json({
      signedIn: false,
      plan: "free",
      monthKey: mk,
      used: 0,
      limit: 3,
      remaining: 3,
    });
  }

  const admin = createSupabaseAdminClient();

  const { data: sub } = await admin
    .from("user_subscriptions")
    .select("plan,status")
    .eq("user_id", user.id)
    .maybeSingle();

  const status = (sub?.status ?? "none").toString().toLowerCase();
  const planRaw = (sub?.plan ?? "free").toString().toLowerCase();
  const plan = status === "active" ? (planRaw === "advanced" ? "advanced" : "basic") : "free";

  // Advanced = unlimited
  if (plan === "advanced") {
    return NextResponse.json({
      signedIn: true,
      plan,
      monthKey: mk,
      used: 0,
      limit: 0,
      remaining: 0,
      unlimited: true,
    });
  }

  const limit = plan === "basic" ? 100 : 3;

  const { data: usageRow } = await admin
    .from("export_usage")
    .select("exports_used")
    .eq("user_id", user.id)
    .eq("month_key", mk)
    .maybeSingle();

  const used = Number(usageRow?.exports_used ?? 0);

  return NextResponse.json({
    signedIn: true,
    plan,
    monthKey: mk,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  });
}
