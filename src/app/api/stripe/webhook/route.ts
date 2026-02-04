// src/app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function toIsoFromUnixSeconds(sec: number | null | undefined) {
  if (!sec || typeof sec !== "number") return null;
  return new Date(sec * 1000).toISOString();
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2025-12-15.clover" });
}

async function upsertSubscriptionRow(args: {
  user_id: string;
  plan: "basic" | "advanced" | "free";
  status: string;
  stripe_customer_id: string | null;
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

  if (typeof args.current_period_end !== "undefined") {
    payload.current_period_end = args.current_period_end;
  }

  const { error } = await admin.from("user_subscriptions").upsert(payload);

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }
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

        if (!userId || !plan) break;

        await upsertSubscriptionRow({
          user_id: userId,
          plan,
          status: "active",
          stripe_customer_id: customerId,
        });

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        const customerId = (sub.customer as string) || null;
        const currentPeriodEnd = toIsoFromUnixSeconds((sub as any).current_period_end);

        // NEW: Use subscription metadata as a fallback path to create the row.
        // This fixes the “Stripe shows subscription but Supabase empty” problem.
        const userId = (sub.metadata as any)?.user_id as string | undefined;
        const plan = (sub.metadata as any)?.plan as "basic" | "advanced" | undefined;

        if (userId && plan) {
          await upsertSubscriptionRow({
            user_id: userId,
            plan,
            status: sub.status,
            stripe_customer_id: customerId,
            current_period_end: currentPeriodEnd,
          });
        } else {
          // If the row already exists (matched by stripe_customer_id), still update status/period end.
          const admin = createSupabaseAdminClient();
          const { error } = await admin
            .from("user_subscriptions")
            .update({
              status: sub.status,
              current_period_end: currentPeriodEnd,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_customer_id", customerId);

          if (error) {
            throw new Error(`Supabase update failed: ${error.message}`);
          }
        }

        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = (sub.customer as string) || null;
        if (!customerId) break;

        const admin = createSupabaseAdminClient();
        const { error } = await admin
          .from("user_subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        if (error) {
          throw new Error(`Supabase update failed: ${error.message}`);
        }

        break;
      }

      default:
        console.log("Unhandled Stripe event:", event.type);
        break;
    }
  } catch (e: any) {
    console.error("Stripe webhook handler error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
