import { NextResponse } from "next/server";
import { getMonthKey } from "@/lib/month";
import { FREE_EXPORTS_PER_MONTH, getPlanLimit } from "@/lib/plans";
import { loadActivePassExpiry, loadEffectivePlan, loadExportsUsed } from "@/lib/quotaServer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
      limit: FREE_EXPORTS_PER_MONTH,
      remaining: FREE_EXPORTS_PER_MONTH,
    });
  }

  const admin = createSupabaseAdminClient();
  const monthKey = getMonthKey();

  try {
    const [plan, passExpiresAt] = await Promise.all([
      loadEffectivePlan(admin, user.id),
      loadActivePassExpiry(admin, user.id),
    ]);
    const { unlimited, limit } = getPlanLimit(plan);

    if (unlimited || passExpiresAt) {
      return NextResponse.json({
        signedIn: true,
        plan,
        passExpiresAt,
        unlimited: true,
        monthKey,
        used: 0,
        limit: 0,
        remaining: 0,
      });
    }

    const used = await loadExportsUsed(admin, user.id, monthKey);

    return NextResponse.json({
      signedIn: true,
      plan,
      passExpiresAt: null,
      unlimited: false,
      monthKey,
      used,
      limit,
      remaining: Math.max(0, limit - used),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Quota status failed.";
    return NextResponse.json({ signedIn: true, message }, { status: 500 });
  }
}
