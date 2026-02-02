// src/app/api/quota/consume/route.ts
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

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { count?: number };
  const count = Math.max(1, Math.floor(body.count ?? 1));

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
  const month = monthKey();

  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("export_usage")
    .select("used")
    .eq("user_id", user.id)
    .eq("month", month)
    .maybeSingle();

  const used = Number(existing?.used ?? 0);
  const nextUsed = used + count;

  if (nextUsed > limit) {
    return NextResponse.json(
      { error: "Quota exceeded", limit, used, remaining: Math.max(0, limit - used) },
      { status: 402 }
    );
  }

  const { error: upsertErr } = await admin
    .from("export_usage")
    .upsert(
      {
        user_id: user.id,
        month,
        used: nextUsed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,month" }
    );

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    plan: activePlan,
    limit,
    used: nextUsed,
    remaining: Math.max(0, limit - nextUsed),
    month,
  });
}
