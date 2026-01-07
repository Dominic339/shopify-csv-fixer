// src/app/api/stripe/checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  throw new Error("Missing STRIPE_SECRET_KEY env var");
}

const stripe = new Stripe(stripeSecret, {
  apiVersion: "2025-12-15.clover",
});

function getBaseUrl(req: Request) {
  // Works on Vercel + locally even if NEXT_PUBLIC_SITE_URL is not set correctly
  const origin = req.headers.get("origin");
  return origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const { plan } = (await req.json()) as { plan?: string };

    const normalizedPlan = plan === "advanced" ? "advanced" : plan === "basic" ? "basic" : null;
    if (!normalizedPlan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const priceId =
      normalizedPlan === "advanced"
        ? process.env.STRIPE_PRICE_ADVANCED
        : process.env.STRIPE_PRICE_BASIC;

    if (!priceId) {
      return NextResponse.json(
        { error: "Missing STRIPE_PRICE_BASIC / STRIPE_PRICE_ADVANCED env var" },
        { status: 500 }
      );
    }

    const baseUrl = getBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/checkout?status=success&plan=${normalizedPlan}`,
      cancel_url: `${baseUrl}/checkout?status=canceled&plan=${normalizedPlan}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Stripe error" },
      { status: 500 }
    );
  }
}
