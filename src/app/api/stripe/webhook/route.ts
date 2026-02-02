// src/app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

function getPlanFromSession(session: Stripe.Checkout.Session): "basic" | "advanced" {
  const p = (session.metadata?.plan ?? "basic").toLowerCase();
  return p === "advanced" ? "advanced" : "basic";
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (e: any) {
    return NextResponse.json({ error: `Webhook error: ${e?.message ?? "unknown"}` }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId =
        session.client_reference_id ||
        (session.metadata?.user_id as string | undefined);

      if (!userId) {
        return NextResponse.json(
          { error: "No user id on session (client_reference_id/metadata.user_id)" },
          { status: 200 }
        );
      }

      const plan = getPlanFromSession(session);

      // If we have a subscription, fetch it so we can store period end + status accurately
      let sub: Stripe.Subscription | null = null;
      if (session.subscription) {
        sub = await stripe.subscriptions.retrieve(session.subscription as string);
      }

      const status = (sub as any)?.status ?? "active";
      const currentPeriodEnd =
        (sub as any)?.current_period_end
          ? new Date(((sub as any).current_period_end as number) * 1000).toISOString()
          : null;

      const stripeCustomerId = (session.customer as string) ?? null;
      const stripeSubscriptionId = (session.subscription as string) ?? null;

      const { error: upsertErr } = await admin
        .from("user_subscriptions")
        .upsert(
          {
            user_id: userId,
            plan,
            status,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (upsertErr) throw upsertErr;
    }

    // Keep Supabase in sync if Stripe changes later
    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;

      const stripeCustomerId = (sub.customer as string) ?? null;
      const stripeSubscriptionId = sub.id;

      // Find the user by stripe_subscription_id first, fallback by stripe_customer_id
      const { data: bySub } = await admin
        .from("user_subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", stripeSubscriptionId)
        .maybeSingle();

      let userId = bySub?.user_id as string | undefined;

      if (!userId && stripeCustomerId) {
        const { data: byCust } = await admin
          .from("user_subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", stripeCustomerId)
          .maybeSingle();
        userId = byCust?.user_id as string | undefined;
      }

      if (userId) {
        const currentPeriodEnd =
          (sub as any)?.current_period_end
            ? new Date(((sub as any).current_period_end as number) * 1000).toISOString()
            : null;

        const { error: updErr } = await admin
          .from("user_subscriptions")
          .update({
            status: (sub as any)?.status ?? "active",
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (updErr) throw updErr;
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Webhook handler failed" }, { status: 500 });
  }
}
