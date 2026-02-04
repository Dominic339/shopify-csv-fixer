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

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { plan } = (await req.json()) as { plan?: "basic" | "advanced" };
  if (!plan) return NextResponse.json({ error: "Missing plan" }, { status: 400 });

  const priceId =
    plan === "basic"
      ? process.env.STRIPE_PRICE_BASIC
      : plan === "advanced"
        ? process.env.STRIPE_PRICE_ADVANCED
        : null;

  if (!priceId) return NextResponse.json({ error: "Missing price for plan" }, { status: 500 });

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/checkout?success=1`,
    cancel_url: `${siteUrl}/?canceled=1`,

    // Keep this (used by checkout.session.completed)
    metadata: {
      user_id: user.id,
      plan,
    },

    // NEW: Put metadata onto the SUBSCRIPTION too.
    // This makes customer.subscription.created/updated contain user_id/plan,
    // so your webhook can always sync Supabase even if checkout.session.completed is missing.
    subscription_data: {
      metadata: {
        user_id: user.id,
        plan,
      },
    },
  });

  return NextResponse.json({ url: session.url });
}
