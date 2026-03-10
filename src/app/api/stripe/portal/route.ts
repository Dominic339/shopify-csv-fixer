// src/app/api/stripe/portal/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeSecretKey } from "@/lib/stripeEnv";

export const runtime = "nodejs";

function getStripe(): Stripe | null {
  const key = getStripeSecretKey();
  return key ? new Stripe(key) : null;
}

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check Stripe key first to give a clear error
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
    }

    // Look up stripe_customer_id using the server client (avoids needing service role key)
    const { data: sub, error: subErr } = await supabase
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subErr) {
      return NextResponse.json(
        { error: "Failed to load subscription record", details: subErr.message },
        { status: 500 }
      );
    }

    const customerId = sub?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json({ error: "No Stripe customer found. Please contact support." }, { status: 400 });
    }

    const siteUrl =
      (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "") || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/profile`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Failed to create billing portal session",
        details: e?.message ?? String(e),
      },
      { status: 500 }
    );
  }
}
