import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Not signed in" },
      { status: 401 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const amount = Math.max(1, Math.min(10, Number(body.amount ?? 1)));

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.rpc("consume_export_quota", {
    p_user_id: user.id,
    p_amount: amount,
  });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Quota consume failed. Make sure consume_export_quota exists.",
        details: error.message,
      },
      { status: 500 }
    );
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    return NextResponse.json(
      { ok: false, message: "Quota consume returned no data" },
      { status: 500 }
    );
  }

  // Advanced: unlimited, no counters
  if (row.unlimited) {
    return NextResponse.json({
      ok: true,
      plan: row.plan,
      unlimited: true,
    });
  }

  // Over limit
  if (!row.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: "Monthly export limit reached.",
        monthKey: row.month_key,
        used: row.used,
        limit: row.quota_limit,
        remaining: row.remaining,
      },
      { status: 403 }
    );
  }

  // Normal success
  return NextResponse.json({
    ok: true,
    plan: row.plan,
    monthKey: row.month_key,
    used: row.used,
    limit: row.quota_limit,
    remaining: row.remaining,
  });
}
