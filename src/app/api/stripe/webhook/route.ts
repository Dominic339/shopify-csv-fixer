// src/app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} env var`);
  return v;
}

function toIsoFromUnixSeconds(sec: number | null | undefined) {
  if (!sec || typeof sec !== "number") return null;
  return new Date(sec * 1000).toISOString();
}

function getStripe() {
  return new Stripe(requireEnv("STRIPE_SECRET_KEY"));
}

async function upsertSubscriptionRow(args: {
  user_id: string;
  plan: "basic" | "advanced" | "free";
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id?: string | null;
  current_period_end?: string | null;
}) {
  const admin = createSupabaseAdminClient();

  const payload: any = {
    user_id: args.user_id,
    plan: args.plan,
    status: args.status,
    stripe_customer_id: args.stripe_customer_id,
    updated_at: new Date().toISOString(),
  };

  if (typeof args.stripe_subscription_id !== "undefined") {
    payload.stripe_subscription_id = args.stripe_subscription_id;
  }

  if (typeof args.current_period_end !== "undefined") {
    payload.current_period_end = args.current_period_end;
  }

  const { error } = await admin.from("user_subscriptions").upsert(payload);

  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
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
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err?.message ?? "unknown error"}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan as "basic" | "advanced" | undefined;

        const customerId = typeof session.customer === "string" ? session.customer : null;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : null;

        if (!userId || !plan) break;

        await upsertSubscriptionRow({
          user_id: userId,
          plan,
          status: "active",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        });

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        const customerId = (sub.customer as string) || null;
        const subscriptionId = sub.id || null;
        const currentPeriodEnd = toIsoFromUnixSeconds((sub as any).current_period_end);

        const userId = (sub.metadata as any)?.user_id as string | undefined;
        const plan = (sub.metadata as any)?.plan as "basic" | "advanced" | undefined;

        if (userId && plan) {
          await upsertSubscriptionRow({
            user_id: userId,
            plan,
            status: sub.status,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            current_period_end: currentPeriodEnd,
          });
        } else {
          // Row exists already (matched by stripe_customer_id). Still update status/period end/sub id.
          const admin = createSupabaseAdminClient();
          const { error } = await admin
            .from("user_subscriptions")
            .update({
              status: sub.status,
              current_period_end: currentPeriodEnd,
              stripe_subscription_id: subscriptionId,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_customer_id", customerId);

          if (error) throw new Error(`Supabase update failed: ${error.message}`);
        }

        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = (sub.customer as string) || null;
        const subscriptionId = sub.id || null;
        if (!customerId) break;

        const admin = createSupabaseAdminClient();
        const { error } = await admin
          .from("user_subscriptions")
          .update({
            status: "canceled",
            stripe_subscription_id: subscriptionId,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        if (error) throw new Error(`Supabase update failed: ${error.message}`);

        break;
      }

      default:
        // ignore
        break;
    }
  } catch (e: any) {
    console.error("Stripe webhook handler error:", e);
    return NextResponse.json({ error: e?.message ?? "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
