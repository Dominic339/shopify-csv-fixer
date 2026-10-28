// src/lib/stripe/webhookSync.ts
// Applies Stripe webhook events to the user_subscriptions table.
//
// Stripe may deliver events more than once and out of order, so handlers never
// trust the event payload's snapshot: they re-fetch the subscription and write
// its current state. Replaying any event therefore converges on the same row.

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PASS_HOURS, type Plan } from "@/lib/plans";
import { grantPass } from "@/lib/quotaServer";

type PaidPlan = Exclude<Plan, "free">;

const LIVE_STATUSES = new Set<Stripe.Subscription.Status>(["active", "trialing", "past_due"]);

/** Plan from the subscription's price (handles portal plan switches); metadata as fallback. */
export function planFromSubscription(
  sub: Stripe.Subscription,
  env: Record<string, string | undefined> = process.env
): PaidPlan | null {
  for (const item of sub.items?.data ?? []) {
    const priceId = item.price?.id;
    if (priceId && priceId === env.STRIPE_PRICE_ADVANCED) return "advanced";
    if (priceId && priceId === env.STRIPE_PRICE_BASIC) return "basic";
  }
  const meta = sub.metadata?.plan;
  return meta === "advanced" || meta === "basic" ? meta : null;
}

/** Billing period end. Newer API versions put it on items; older ones on the subscription. */
export function periodEndFromSubscription(sub: Stripe.Subscription): string | null {
  const itemEnds = (sub.items?.data ?? [])
    .map((i) => i.current_period_end)
    .filter((n): n is number => typeof n === "number");
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  const sec = itemEnds.length ? Math.max(...itemEnds) : legacy;
  return typeof sec === "number" ? new Date(sec * 1000).toISOString() : null;
}

function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

type SubRow = { user_id: string; status: string | null; stripe_subscription_id: string | null };

async function findRow(admin: SupabaseClient, column: string, value: string): Promise<SubRow | null> {
  const { data, error } = await admin
    .from("user_subscriptions")
    .select("user_id,status,stripe_subscription_id")
    .eq(column, value)
    .maybeSingle();
  if (error) throw new Error(`Supabase lookup failed: ${error.message}`);
  return (data as SubRow | null) ?? null;
}

/** Write a subscription's current state to the owning user's row. */
export async function syncSubscription(
  admin: SupabaseClient,
  sub: Stripe.Subscription,
  userIdHint?: string | null
): Promise<"updated" | "ignored_stale" | "no_user"> {
  const customerId = idOf(sub.customer);
  const userId = userIdHint || sub.metadata?.user_id || null;

  const existing =
    (userId && (await findRow(admin, "user_id", userId))) ||
    (await findRow(admin, "stripe_subscription_id", sub.id)) ||
    (customerId && (await findRow(admin, "stripe_customer_id", customerId))) ||
    null;

  const ownerId = userId ?? existing?.user_id ?? null;
  if (!ownerId) return "no_user";

  // A late event for an older subscription must not clobber a newer live one.
  if (
    existing?.stripe_subscription_id &&
    existing.stripe_subscription_id !== sub.id &&
    LIVE_STATUSES.has(existing.status as Stripe.Subscription.Status) &&
    !LIVE_STATUSES.has(sub.status)
  ) {
    return "ignored_stale";
  }

  const plan = planFromSubscription(sub);
  const row: Record<string, unknown> = {
    user_id: ownerId,
    status: sub.status,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    current_period_end: periodEndFromSubscription(sub),
    updated_at: new Date().toISOString(),
  };
  if (plan) row.plan = plan;
  else if (!existing) row.plan = "free";

  const { error } = await admin.from("user_subscriptions").upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  return "updated";
}

export type WebhookDeps = { stripe: Stripe; admin: SupabaseClient };

export async function handleStripeEvent(event: Stripe.Event, { stripe, admin }: WebhookDeps) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;

      if (session.mode === "payment" && session.metadata?.plan === "pass") {
        // Delayed payment methods complete later via async_payment_succeeded.
        if (session.payment_status !== "paid") return "skipped";
        const userId = session.metadata?.user_id ?? session.client_reference_id;
        if (!userId) return "no_user";
        return grantPass(admin, { userId, sessionId: session.id, hours: PASS_HOURS });
      }

      const subscriptionId = idOf(session.subscription);
      if (session.mode !== "subscription" || !subscriptionId) return "skipped";

      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      return syncSubscription(admin, sub, session.metadata?.user_id ?? session.client_reference_id);
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = await stripe.subscriptions.retrieve(event.data.object.id);
      return syncSubscription(admin, sub);
    }

    default:
      return "skipped";
  }
}

// ── Idempotency ───────────────────────────────────────────────────────────

/**
 * Record that we are processing `event`. Returns "duplicate" if it was already
 * processed, or "untracked" if the stripe_events table does not exist yet
 * (handlers are idempotent, so processing proceeds either way).
 */
export async function claimEvent(admin: SupabaseClient, event: Stripe.Event) {
  const { error } = await admin.from("stripe_events").insert({ id: event.id, type: event.type });
  if (!error) return "claimed" as const;
  if (error.code === "23505") return "duplicate" as const;
  console.warn("stripe_events unavailable; apply supabase/migrations.", error.message);
  return "untracked" as const;
}

/** Forget a claim so Stripe's retry can process the event again. */
export async function releaseEvent(admin: SupabaseClient, eventId: string) {
  await admin.from("stripe_events").delete().eq("id", eventId);
}
