import { NextResponse } from "next/server";
import { getMonthKey } from "@/lib/month";
import { getPlanLimit } from "@/lib/plans";
import { consumeExports, loadEffectivePlan } from "@/lib/quotaServer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

    const body: { amount?: unknown } = await req.json().catch(() => ({}));
    const amount = Math.max(1, Math.min(10, Number(body.amount ?? 1) || 1));
    const monthKey = getMonthKey();

    const admin = createSupabaseAdminClient();
    const plan = await loadEffectivePlan(admin, user.id);
    const { unlimited, limit } = getPlanLimit(plan);

    // Advanced is unlimited: never block, never count
    if (unlimited) {
      return NextResponse.json({
        ok: true,
        signedIn: true,
        plan,
        unlimited: true,
        monthKey,
        used: 0,
        limit: 0,
        remaining: 0,
      });
    }

    const result = await consumeExports(admin, { userId: user.id, monthKey, amount, limit });

    return NextResponse.json(
      {
        ok: result.ok,
        ...(result.ok ? {} : { message: "Monthly export limit reached." }),
        signedIn: true,
        plan,
        unlimited: false,
        monthKey,
        used: result.used,
        limit,
        remaining: Math.max(0, limit - result.used),
      },
      { status: result.ok ? 200 : 403 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Quota consume failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
