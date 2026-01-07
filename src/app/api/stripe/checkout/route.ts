// src/app/api/stripe/checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = (await req.json()) as { plan: "basic" | "advanced" };

    const priceId =
      plan === "advanced"
        ? process.env.STRIPE_PRICE_ADVANCED
        : process.env.STRIPE_PRICE_BASIC;

    if (!priceId) {
      return NextResponse.json({ error: "Missing price id" }, { status: 500 });
    }

    // IMPORTANT: use the deployed URL in production (set in Vercel env vars)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_SITE_URL is not set" },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],

      // This is how the webhook knows WHICH USER paid
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        plan,
      },

      // Helps Stripe associate the checkout with an identity
      customer_email: user.email ?? undefined,

      success_url: `${siteUrl}/checkout?status=success&plan=${plan}`,
      cancel_url: `${siteUrl}/checkout?status=canceled&plan=${plan}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
