// src/app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

function toIsoFromUnixSeconds(sec: number | null | undefined) {
  if (!sec || typeof sec !== "number") return null;
  return new Date(sec * 1000).toISOString();
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err?.message ?? "unknown error"}` },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan as "basic" | "advanced" | undefined;

        if (!userId || !plan) break;

        await admin.from("user_subscriptions").upsert({
          user_id: userId,
          plan,
          stripe_customer_id: session.customer,
          status: "active",
          updated_at: new Date().toISOString(),
        });

        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;

        const customerId = (sub.customer as string) || null;
        if (!customerId) break;

        // Stripe typings can vary; this is safe and keeps your logic.
        const currentPeriodEnd = toIsoFromUnixSeconds((sub as any).current_period_end);

        await admin
          .from("user_subscriptions")
          .update({
            status: sub.status,
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = (sub.customer as string) || null;
        if (!customerId) break;

        await admin
          .from("user_subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      default: {
        // keep a log so you can extend later
        console.log("Unhandled Stripe event:", event.type);
        break;
      }
    }
  } catch (dbErr: any) {
    console.error("Webhook DB error:", dbErr);
    return NextResponse.json(
      { error: dbErr?.message ?? "Database update failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
