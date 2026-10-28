// src/app/api/stripe/checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeSecretKey } from "@/lib/stripeEnv";
import { resolveUser } from "@/lib/supabase/resolveUser";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const stripeKey = getStripeSecretKey();
    if (!stripeKey) {
      return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
    }

    const stripe = new Stripe(stripeKey);
    const supabaseAdmin = createSupabaseAdminClient();

    const cloned = req.clone();
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { plan } = (await cloned.json()) as { plan?: "basic" | "advanced" };
    if (!plan) {
      return NextResponse.json({ error: "Missing plan" }, { status: 400 });
    }

    const priceId =
      plan === "basic"
        ? process.env.STRIPE_PRICE_BASIC
        : plan === "advanced"
          ? process.env.STRIPE_PRICE_ADVANCED
          : null;

    if (!priceId) {
      return NextResponse.json({ error: "Missing price for plan" }, { status: 500 });
    }

    // Look up existing Stripe customer for this user if one already exists
    const { data: sub } = await supabaseAdmin
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const stripeCustomerId = sub?.stripe_customer_id ?? null;

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // /checkout reads ?status= to confirm the subscription (or say nothing was charged).
      success_url: `${siteUrl}/checkout?status=success&plan=${plan}`,
      cancel_url: `${siteUrl}/checkout?status=canceled&plan=${plan}`,
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan },
      subscription_data: {
        metadata: { user_id: user.id, plan },
      },
      ...(stripeCustomerId
        ? { customer: stripeCustomerId }
        : user.email
          ? { customer_email: user.email }
          : {}),
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
