// src/app/api/stripe/checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { plan } = (await req.json()) as { plan?: "basic" | "advanced" };
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/checkout?success=1`,
    cancel_url: `${siteUrl}/?canceled=1`,

    // Prefill email to match the logged-in Supabase user (reduces mistakes)
    customer_email: user.email ?? undefined,

    // Redundant safety link
    client_reference_id: user.id,

    // Used by your webhook to attach subscription to correct app user
    metadata: {
      user_id: user.id,
      plan,
    },

    // Also attach metadata to the subscription itself (helps subscription.* events)
    subscription_data: {
      metadata: {
        user_id: user.id,
        plan,
      },
    },
  });

  return NextResponse.json({ url: session.url });
}
