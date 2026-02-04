// src/app/api/quota/consume/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPlanLimits } from "@/lib/quota";

function monthKey(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Increments the user's export counter for the current month.
 * Table schema (public.export_usage):
 * - user_id uuid
 * - month_key text (YYYY-MM)
 * - exports_used int4
 * - updated_at timestamptz
 */
export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ ok: false, message: "Not signed in" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const amount = Math.max(1, Math.min(10, Number(body.amount || 1)));

  // Determine the plan from user_subscriptions (kept in sync by Stripe webhooks)
  const admin = createSupabaseAdminClient();
  const { data: subRow } = await admin
    .from("user_subscriptions")
    .select("plan,status")
    .eq("user_id", user.id)
    .maybeSingle();

  const plan = (subRow?.plan || "free").toString().toLowerCase();
  const status = (subRow?.status || "none").toString().toLowerCase();
  const effectivePlan = status === "active" ? plan : "free";
  const limit = getPlanLimits(effectivePlan).exportsPerMonth;

  const mk = monthKey();

  // Read current usage
  const { data: usageRow, error: usageReadError } = await admin
    .from("export_usage")
    .select("exports_used")
    .eq("user_id", user.id)
    .eq("month_key", mk)
    .maybeSingle();

  if (usageReadError) {
    return NextResponse.json({ ok: false, message: usageReadError.message }, { status: 500 });
  }

  const current = Number(usageRow?.exports_used || 0);
  const nextUsed = current + amount;

  if (nextUsed > limit) {
    return NextResponse.json(
      {
        ok: false,
        message: "Monthly export limit reached.",
        monthKey: mk,
        used: current,
        limit,
        remaining: Math.max(0, limit - current),
        plan: effectivePlan,
      },
      { status: 403 }
    );
  }

  // Write new usage
  if (usageRow) {
    const { error: updErr } = await admin
      .from("export_usage")
      .update({ exports_used: nextUsed, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("month_key", mk);

    if (updErr) {
      return NextResponse.json({ ok: false, message: updErr.message }, { status: 500 });
    }
  } else {
    const { error: insErr } = await admin.from("export_usage").insert({
      user_id: user.id,
      month_key: mk,
      exports_used: nextUsed,
      updated_at: new Date().toISOString(),
    });

    if (insErr) {
      return NextResponse.json({ ok: false, message: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    monthKey: mk,
    used: nextUsed,
    limit,
    remaining: Math.max(0, limit - nextUsed),
    plan: effectivePlan,
  });
}
