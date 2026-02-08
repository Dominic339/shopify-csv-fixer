import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function hasEnv(name: string) {
  return Boolean(process.env[name] && String(process.env[name]).length > 0);
}

type AuthState = {
  signedIn: boolean;
  userId: string | null;
};

type SubscriptionRead = {
  ok: boolean;
  error: string | null;
};

export async function GET() {
  const checks = {
    NEXT_PUBLIC_SITE_URL: hasEnv("NEXT_PUBLIC_SITE_URL"),
    NEXT_PUBLIC_SUPABASE_URL: hasEnv("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: hasEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: hasEnv("SUPABASE_SERVICE_ROLE_KEY"),
    STRIPE_SECRET_KEY: hasEnv("STRIPE_SECRET_KEY"),
    STRIPE_WEBHOOK_SECRET: hasEnv("STRIPE_WEBHOOK_SECRET"),
    STRIPE_PRICE_BASIC: hasEnv("STRIPE_PRICE_BASIC"),
    STRIPE_PRICE_ADVANCED: hasEnv("STRIPE_PRICE_ADVANCED"),
  };

  let auth: AuthState = { signedIn: false, userId: null };
  let subscriptionRead: SubscriptionRead = { ok: true, error: null };

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      auth = { signedIn: true, userId: user.id };

      const admin = createSupabaseAdminClient();
      const { error } = await admin
        .from("user_subscriptions")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      subscriptionRead = {
        ok: !error,
        error: error?.message ?? null,
      };
    }
  } catch (e: any) {
    subscriptionRead = {
      ok: false,
      error: e?.message ?? "health check failed",
    };
  }

  const ok =
    Object.values(checks).every(Boolean) &&
    subscriptionRead.ok;

  return NextResponse.json(
    {
      ok,
      env: checks,
      auth,
      subscriptionRead,
    },
    { status: ok ? 200 : 500 }
  );
}
