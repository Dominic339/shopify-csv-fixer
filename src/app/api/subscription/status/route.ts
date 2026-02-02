// src/app/api/subscription/status/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ signedIn: false, plan: "free", status: "none" });
  }

  const { data } = await supabase
    .from("user_subscriptions")
    .select("plan,status,current_period_end,stripe_customer_id,stripe_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const plan = data?.status === "active" ? data.plan : "free";

  return NextResponse.json({
    signedIn: true,
    plan: plan ?? "free",
    status: data?.status ?? "none",
    current_period_end: data?.current_period_end ?? null,
    stripe_customer_id: data?.stripe_customer_id ?? null,
    stripe_subscription_id: data?.stripe_subscription_id ?? null,
  });
}
