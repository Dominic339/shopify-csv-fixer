import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(req: Request) {
  try {
    const { plan } = await req.json();

    const priceId =
      plan === "advanced"
        ? process.env.STRIPE_PRICE_ADVANCED
        : process.env.STRIPE_PRICE_BASIC;

    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout?status=success&plan=${plan}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout?status=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Stripe error" },
      { status: 500 }
    );
  }
}
