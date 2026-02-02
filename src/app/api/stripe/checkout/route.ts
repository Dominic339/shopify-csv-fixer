// src/app/api/stripe/checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

function siteUrl() {
  // Vercel prod should be https://csnest.vercel.app (set in env)
  const u = process.env.NEXT_PUBLIC_SITE_URL;
  if (!u) throw new Error("Missing NEXT_PUBLIC_SITE_URL");
  return u.replace(/\/$/, "");
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { plan } = (await req.json().catch(() => ({}))) as { plan?: string };

    const normalizedPlan = plan === "advanced" ? "advanced" : plan === "basic" ? "basic" : null;
    if (!normalizedPlan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // If user already has active subscription, block duplicate checkout
    const { data: existingSub } = await supabase
      .from("user_subscriptions")
      .select("status, plan")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingSub?.status === "active") {
      return NextResponse.json(
        { error: `Already subscribed (${existingSub.plan})` },
        { status: 409 }
      );
    }

    const priceId =
      normalizedPlan === "advanced"
        ? process.env.STRIPE_PRICE_ADVANCED
        : process.env.STRIPE_PRICE_BASIC;

    if (!priceId) {
      return NextResponse.json(
        { error: "Missing STRIPE_PRICE_* env var" },
        { status: 500 }
      );
    }

    const base = siteUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/checkout?status=success&plan=${normalizedPlan}`,
      cancel_url: `${base}/checkout?status=canceled&plan=${normalizedPlan}`,
      // THIS is what lets your webhook map Stripe -> Supabase user
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        plan: normalizedPlan,
      },
      // optional, helps keep the same customer across retries
      customer_creation: "always",
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
