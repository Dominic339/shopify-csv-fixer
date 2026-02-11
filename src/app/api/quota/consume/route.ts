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

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // IMPORTANT: signed-out must return 401 so the client can fall back to local quota
    if (!user) {
      return NextResponse.json({ ok: false, message: "Not signed in" }, { status: 401 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const amount = Math.max(1, Math.min(10, Number(body.amount ?? 1)));
    const monthKey = getMonthKey();

    const admin = createSupabaseAdminClient();

    // Determine plan from user_subscriptions
    const { data: subRow, error: subErr } = await admin
      .from("user_subscriptions")
      .select("plan,status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subErr) {
      return NextResponse.json(
        { ok: false, message: subErr.message || "Failed to load subscription." },
        { status: 500 }
      );
    }

    const status = String(subRow?.status ?? "").toLowerCase();
    const rawPlan = String(subRow?.plan ?? "free").toLowerCase();
    const plan: Plan = rawPlan === "advanced" ? "advanced" : rawPlan === "basic" ? "basic" : "free";

    // Only treat as paid if status is active
    const effectivePlan: Plan = status === "active" ? plan : "free";
    const { unlimited, limit } = getPlanLimit(effectivePlan);

    // Advanced is unlimited: never block, never count
    if (unlimited) {
      return NextResponse.json(
        {
          ok: true,
          signedIn: true,
          plan: effectivePlan,
          unlimited: true,
          monthKey,
          used: 0,
          limit: 0,
          remaining: 0,
        },
        { status: 200 }
      );
    }

    // Read current usage for this month
    const { data: usageRow, error: usageErr } = await admin
      .from("export_usage")
      .select("exports_used")
      .eq("user_id", user.id)
      .eq("month_key", monthKey)
      .maybeSingle();

    if (usageErr) {
      return NextResponse.json(
        { ok: false, message: usageErr.message || "Failed to read usage." },
        { status: 500 }
      );
    }

    const used = Number(usageRow?.exports_used ?? 0);
    const nextUsed = used + amount;

    if (nextUsed > limit) {
      return NextResponse.json(
        {
          ok: false,
          message: "Monthly export limit reached.",
          signedIn: true,
          plan: effectivePlan,
          unlimited: false,
          monthKey,
          used,
          limit,
          remaining: Math.max(0, limit - used),
        },
        { status: 403 }
      );
    }

    // Upsert next usage
    const { error: upErr } = await admin
      .from("export_usage")
      .upsert(
        {
          user_id: user.id,
          month_key: monthKey,
          exports_used: nextUsed,
        },
        { onConflict: "user_id,month_key" }
      );

    if (upErr) {
      return NextResponse.json(
        { ok: false, message: upErr.message || "Failed to update usage." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        signedIn: true,
        plan: effectivePlan,
        unlimited: false,
        monthKey,
        used: nextUsed,
        limit,
        remaining: Math.max(0, limit - nextUsed),
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Quota consume failed." },
      { status: 500 }
    );
  }
}
