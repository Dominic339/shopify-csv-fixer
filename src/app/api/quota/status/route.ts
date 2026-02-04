// src/app/api/quota/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMonthKey } from "@/lib/month";
import { getPlanLimits } from "@/lib/quota";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const month = getMonthKey();

  // Not signed in => free device UX (client uses localStorage)
  if (!user) {
    const limit = getPlanLimits("free").exportsPerMonth;
    return NextResponse.json({
      signedIn: false,
      plan: "free",
      status: "none",
      limit,
      used: 0,
      remaining: limit,
      month,
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
  const limit = getPlanLimits(plan).exportsPerMonth;

  const { data: usageRow } = await admin
    .from("export_usage")
    .select("exports_used")
    .eq("user_id", user.id)
    .eq("month_key", month)
    .maybeSingle();

  const used = Number(usageRow?.exports_used ?? 0);
  const remaining = Math.max(0, limit - used);

  return NextResponse.json({
    signedIn: true,
    plan,
    status,
    limit,
    used,
    remaining,
    month,
  });
}

/**
 * Consume 1 export for signed-in users.
 * Writes to export_usage (user_id, month_key, exports_used, updated_at).
 *
 * NOTE: Free (not signed in) is tracked client-side via localStorage (Option A).
 */
export async function POST() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Not signed in" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const month_key = getMonthKey();

  // Determine plan
  const { data: sub } = await admin
    .from("user_subscriptions")
    .select("plan,status")
    .eq("user_id", user.id)
    .maybeSingle();

  const status = (sub?.status ?? "none").toString().toLowerCase();
  const planRaw = (sub?.plan ?? "free").toString().toLowerCase();
  const plan = status === "active" ? (planRaw === "advanced" ? "advanced" : "basic") : "free";
  const limit = getPlanLimits(plan).exportsPerMonth;

  // Read existing usage for this month
  const { data: usageRow, error: readErr } = await admin
    .from("export_usage")
    .select("exports_used")
    .eq("user_id", user.id)
    .eq("month_key", month_key)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ ok: false, message: readErr.message }, { status: 500 });
  }

  const current = Number(usageRow?.exports_used ?? 0);

  if (current >= limit) {
    return NextResponse.json({ ok: false, message: "Monthly export limit reached." }, { status: 429 });
  }

  const next = current + 1;

  // Update or insert without requiring a DB unique constraint
  if (usageRow) {
    const { error: updErr } = await admin
      .from("export_usage")
      .update({ exports_used: next, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("month_key", month_key);

    if (updErr) {
      return NextResponse.json({ ok: false, message: updErr.message }, { status: 500 });
    }
  } else {
    const { error: insErr } = await admin.from("export_usage").insert({
      user_id: user.id,
      month_key,
      exports_used: next,
      updated_at: new Date().toISOString(),
    });

    if (insErr) {
      return NextResponse.json({ ok: false, message: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    plan,
    month: month_key,
    used: next,
    limit,
    remaining: Math.max(0, limit - next),
  });
}
