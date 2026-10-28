// src/app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeSecretKey } from "@/lib/stripeEnv";
import { claimEvent, handleStripeEvent, releaseEvent } from "@/lib/stripe/webhookSync";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const stripeKey = getStripeSecretKey();
  if (!stripeKey) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }
  const stripe = new Stripe(stripeKey);

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const claim = await claimEvent(admin, event);
  if (claim === "duplicate") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handleStripeEvent(event, { stripe, admin });
  } catch (e) {
    console.error("Stripe webhook handler error:", e);
    // Let Stripe's retry process this event again.
    if (claim === "claimed") await releaseEvent(admin, event.id).catch(() => {});
    const message = e instanceof Error ? e.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
