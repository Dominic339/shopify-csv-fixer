// src/app/api/stripe/checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} env var`);
  return v;
}

const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));

export async function POST(req: Request) {
  try {
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

      // Used by checkout.session.completed webhook
      metadata: {
        user_id: user.id,
        plan,
      },

      // Also set metadata onto the subscription so subscription events can rebuild state
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Checkout failed" }, { status: 500 });
  }
}
