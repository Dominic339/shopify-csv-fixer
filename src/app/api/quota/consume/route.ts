import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function monthKey(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Not signed in" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const amount = Math.max(1, Math.min(10, Number(body.amount || 1)));

  const admin = createSupabaseAdminClient();

  const { data: subRow } = await admin
    .from("user_subscriptions")
    .select("plan,status")
    .eq("user_id", user.id)
    .maybeSingle();

  const status = (subRow?.status || "none").toString().toLowerCase();
  const planRaw = (subRow?.plan || "free").toString().toLowerCase();
  const plan = status === "active" ? (planRaw === "advanced" ? "advanced" : "basic") : "free";

  // Truly unlimited for Advanced: do not write usage rows at all
  if (plan === "advanced") {
    return NextResponse.json({ ok: true, plan, unlimited: true });
  }

  const limit = plan === "basic" ? 100 : 3;
  const mk = monthKey();

  const { data: usageRow, error: readErr } = await admin
    .from("export_usage")
    .select("exports_used")
    .eq("user_id", user.id)
    .eq("month_key", mk)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ ok: false, message: readErr.message }, { status: 500 });
  }

  const current = Number(usageRow?.exports_used || 0);
  const next = current + amount;

  if (next > limit) {
    return NextResponse.json(
      { ok: false, message: "Monthly export limit reached.", monthKey: mk, used: current, limit },
      { status: 403 }
    );
  }

  if (usageRow) {
    const { error: updErr } = await admin
      .from("export_usage")
      .update({ exports_used: next, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("month_key", mk);

    if (updErr) return NextResponse.json({ ok: false, message: updErr.message }, { status: 500 });
  } else {
    const { error: insErr } = await admin.from("export_usage").insert({
      user_id: user.id,
      month_key: mk,
      exports_used: next,
      updated_at: new Date().toISOString(),
    });

    if (insErr) return NextResponse.json({ ok: false, message: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    plan,
    monthKey: mk,
    used: next,
    limit,
    remaining: Math.max(0, limit - next),
  });
}
