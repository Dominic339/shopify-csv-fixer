import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId =
        session.client_reference_id ||
        (session.metadata?.user_id as string | undefined);

      const plan = (session.metadata?.plan as string | undefined) ?? "basic";

      if (!userId) {
        return NextResponse.json(
          { error: "No user id on session (client_reference_id/metadata)" },
          { status: 400 }
        );
      }

      // Pull subscription for accurate status/period end
      let sub: Stripe.Subscription | null = null;
      if (session.subscription) {
        sub = await stripe.subscriptions.retrieve(session.subscription as string);
      }

      const status = sub?.status ?? "active";

      // Stripe typings may not include current_period_end yet, so read it safely
      const currentPeriodEndSec = (sub as any)?.current_period_end as number | undefined;
      const currentPeriodEnd = currentPeriodEndSec
        ? new Date(currentPeriodEndSec * 1000).toISOString()
        : null;

      const { error: upsertErr } = await admin
        .from("user_subscriptions")
        .upsert(
          {
            user_id: userId,
            plan,
            status,
            stripe_customer_id: (session.customer as string) ?? null,
            stripe_subscription_id: (session.subscription as string) ?? null,
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

      const currentPeriodEndSec = (sub as any)?.current_period_end as number | undefined;
      const currentPeriodEnd = currentPeriodEndSec
        ? new Date(currentPeriodEndSec * 1000).toISOString()
        : null;

      const { error: updErr } = await admin
        .from("user_subscriptions")
        .update({
          status: sub.status,
          current_period_end: currentPeriodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", sub.id);

      if (updErr) throw updErr;
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Webhook handler failed" },
      { status: 500 }
    );
  }
}
