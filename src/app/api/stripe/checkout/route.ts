// src/app/api/stripe/checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripeSecretKey } from "@/lib/stripeEnv";

export const runtime = "nodejs";

/** Resolve the authenticated user from cookies OR a Bearer token. */
async function resolveUser(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // 1. Try Bearer token from Authorization header
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const client = createClient(url, anonKey);
      const { data: { user } } = await client.auth.getUser(token);
      if (user) return user;
    }
  }

  // 2. Fall back to cookie-based session
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const { createServerClient } = await import("@supabase/ssr");
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet: any[]) {
        try { for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options); }
        catch { /* Server Component */ }
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(req: Request) {
  try {
    const stripeKey = getStripeSecretKey();
    if (!stripeKey) {
      return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
    }

    const stripe = new Stripe(stripeKey);

    // Clone request before reading body (resolveUser reads headers, not body)
    const cloned = req.clone();
    const user = await resolveUser(req);
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { plan } = (await cloned.json()) as { plan?: "basic" | "advanced" };
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
      metadata: { user_id: user.id, plan },
      subscription_data: { metadata: { user_id: user.id, plan } },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Checkout failed" }, { status: 500 });
  }
}
