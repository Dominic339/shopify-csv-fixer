// src/app/api/stripe/checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(req: Request) {
  try {
    const { plan } = (await req.json()) as { plan?: string };

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const user = data.user;
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SITE_URL" },
        { status: 500 }
      );
    }

    const priceId =
      plan === "advanced"
        ? process.env.STRIPE_PRICE_ADVANCED
        : process.env.STRIPE_PRICE_BASIC;

    if (!priceId) {
      return NextResponse.json(
        { error: "Missing Stripe price id for plan" },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],

      // This is the key: tie Stripe session to your Supabase user
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        plan: plan === "advanced" ? "advanced" : "basic",
      },

      success_url: `${siteUrl}/checkout?status=success&plan=${encodeURIComponent(
        plan ?? "basic"
      )}`,
      cancel_url: `${siteUrl}/checkout?status=canceled&plan=${encodeURIComponent(
        plan ?? "basic"
      )}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
