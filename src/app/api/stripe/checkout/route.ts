import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { plan } = (await req.json()) as { plan: "basic" | "advanced" };

    const priceId =
      plan === "basic"
        ? process.env.STRIPE_PRICE_BASIC
        : process.env.STRIPE_PRICE_ADVANCED;

    if (!priceId) {
      return NextResponse.json({ ok: false, error: "missing_price_id" }, { status: 500 });
    }

    // Require login for paid plans
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      return NextResponse.json({ ok: false, error: "not_logged_in" }, { status: 401 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Create checkout session (subscription)
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/account?checkout=success`,
      cancel_url: `${siteUrl}/?checkout=cancel`,
      // Link Stripe objects to Supabase user
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
