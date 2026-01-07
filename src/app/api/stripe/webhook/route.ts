// src/app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err?.message ?? "unknown"}` },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId =
        (session.client_reference_id as string | null) ||
        (session.metadata?.user_id as string | undefined);

      const plan = (session.metadata?.plan as string | undefined) ?? "basic";

      if (!userId) {
        // We can't attach it to a user; acknowledge so Stripe doesn't retry forever
        return NextResponse.json({ ok: true, skipped: "missing_user_id" });
      }

      const subscriptionId = session.subscription as string | null;
      let sub: Stripe.Subscription | null = null;

      if (subscriptionId) {
        sub = await stripe.subscriptions.retrieve(subscriptionId);
      }

      const status = sub?.status ?? "active";
      const currentPeriodEnd =
        typeof (sub as any)?.current_period_end === "number"
          ? new Date(((sub as any).current_period_end as number) * 1000).toISOString()
          : null;

      const stripeCustomerId =
        typeof session.customer === "string" ? session.customer : null;

      const stripeSubscriptionId =
        typeof session.subscription === "string" ? session.subscription : null;

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

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;

      const stripeSubscriptionId = sub.id;
      const status = sub.status;

      const currentPeriodEnd =
        typeof (sub as any)?.current_period_end === "number"
          ? new Date(((sub as any).current_period_end as number) * 1000).toISOString()
          : null;

      const { error: updateErr } = await admin
        .from("user_subscriptions")
        .update({
          status,
          current_period_end: currentPeriodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", stripeSubscriptionId);

      // If you haven’t stored stripe_subscription_id yet, this won't match anything.
      // That's why the checkout.session.completed handler above is important.
      if (updateErr) throw updateErr;
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // Returning 500 makes Stripe retry, which is what you want for transient DB issues.
    return NextResponse.json(
      { ok: false, error: err?.message ?? "unknown" },
      { status: 500 }
    );
  }
}
