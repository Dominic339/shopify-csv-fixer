// Unit tests for Stripe webhook syncing against an in-memory Supabase stand-in.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  claimEvent,
  handleStripeEvent,
  periodEndFromSubscription,
  planFromSubscription,
  releaseEvent,
} from "@/lib/stripe/webhookSync";

type Row = Record<string, unknown>;

/** Just enough of the supabase-js query builder for webhookSync. */
function fakeSupabase() {
  const tables: Record<string, Row[]> = { user_subscriptions: [], stripe_events: [] };
  const keys: Record<string, string> = { user_subscriptions: "user_id", stripe_events: "id" };

  function from(name: string) {
    const rows = tables[name];
    const key = keys[name];
    const filters: [string, unknown][] = [];
    const match = (r: Row) => filters.every(([c, v]) => r[c] === v);

    const builder = {
      select: () => builder,
      eq: (c: string, v: unknown) => {
        filters.push([c, v]);
        return builder;
      },
      maybeSingle: async () => ({ data: rows.find(match) ?? null, error: null }),
      insert: async (row: Row) => {
        if (rows.some((r) => r[key] === row[key])) return { error: { code: "23505", message: "dup" } };
        rows.push({ ...row });
        return { error: null };
      },
      upsert: async (row: Row) => {
        const found = rows.find((r) => r[key] === row[key]);
        if (found) Object.assign(found, row);
        else rows.push({ ...row });
        return { error: null };
      },
      delete: () => ({
        eq: async (c: string, v: unknown) => {
          tables[name] = rows.filter((r) => r[c] !== v);
          return { error: null };
        },
      }),
    };
    return builder;
  }

  return { admin: { from } as unknown as SupabaseClient, tables };
}

function makeSub(over: Partial<Stripe.Subscription> & { priceId?: string; periodEnd?: number } = {}) {
  const { priceId = "price_basic", periodEnd = 1_800_000_000, ...rest } = over;
  return {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    metadata: { user_id: "user_1", plan: "basic" },
    items: { data: [{ price: { id: priceId }, current_period_end: periodEnd }] },
    ...rest,
  } as unknown as Stripe.Subscription;
}

function fakeStripe(subs: Record<string, Stripe.Subscription>) {
  return {
    subscriptions: { retrieve: vi.fn(async (id: string) => subs[id]) },
  } as unknown as Stripe;
}

function event(type: string, object: unknown, id = "evt_1") {
  return { id, type, data: { object } } as unknown as Stripe.Event;
}

const ENV = { STRIPE_PRICE_BASIC: "price_basic", STRIPE_PRICE_ADVANCED: "price_adv" };

describe("webhookSync", () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = { ...process.env };
    Object.assign(process.env, ENV);
  });

  afterEach(() => {
    process.env = saved as NodeJS.ProcessEnv;
  });

  it("derives the plan from the price, falling back to metadata", () => {
    expect(planFromSubscription(makeSub({ priceId: "price_adv" }), ENV)).toBe("advanced");
    expect(planFromSubscription(makeSub({ priceId: "price_other" }), ENV)).toBe("basic");
    expect(planFromSubscription(makeSub({ priceId: "price_other", metadata: {} }), ENV)).toBeNull();
  });

  it("reads period end from items, or the legacy top-level field", () => {
    expect(periodEndFromSubscription(makeSub({ periodEnd: 1_800_000_000 }))).toBe("2027-01-15T08:00:00.000Z");
    const legacy = { ...makeSub(), items: { data: [] }, current_period_end: 1_800_000_000 };
    expect(periodEndFromSubscription(legacy as unknown as Stripe.Subscription)).toBe("2027-01-15T08:00:00.000Z");
  });

  it("checkout completion writes the subscription's real status, not 'active'", async () => {
    const { admin, tables } = fakeSupabase();
    const stripe = fakeStripe({ sub_1: makeSub({ status: "incomplete" }) });
    const session = { mode: "subscription", subscription: "sub_1", metadata: { user_id: "user_1" } };

    await handleStripeEvent(event("checkout.session.completed", session), { stripe, admin });

    expect(tables.user_subscriptions[0]).toMatchObject({
      user_id: "user_1",
      plan: "basic",
      status: "incomplete",
      stripe_subscription_id: "sub_1",
    });
  });

  it("re-fetches state, so an out-of-order 'updated' cannot revive a canceled sub", async () => {
    const { admin, tables } = fakeSupabase();
    const stripe = fakeStripe({ sub_1: makeSub({ status: "canceled" }) });

    await handleStripeEvent(event("customer.subscription.deleted", { id: "sub_1" }, "evt_2"), { stripe, admin });
    await handleStripeEvent(event("customer.subscription.updated", { id: "sub_1" }, "evt_1"), { stripe, admin });

    expect(tables.user_subscriptions[0].status).toBe("canceled");
  });

  it("picks up plan changes made in the billing portal", async () => {
    const { admin, tables } = fakeSupabase();
    const subs = { sub_1: makeSub() };
    const stripe = fakeStripe(subs);

    await handleStripeEvent(event("customer.subscription.created", { id: "sub_1" }), { stripe, admin });
    subs.sub_1 = makeSub({ priceId: "price_adv" }); // metadata still says "basic"
    await handleStripeEvent(event("customer.subscription.updated", { id: "sub_1" }, "evt_2"), { stripe, admin });

    expect(tables.user_subscriptions[0].plan).toBe("advanced");
  });

  it("finds the user by customer when the subscription has no metadata", async () => {
    const { admin, tables } = fakeSupabase();
    tables.user_subscriptions.push({ user_id: "user_1", plan: "basic", status: "active", stripe_customer_id: "cus_1" });
    const stripe = fakeStripe({ sub_1: makeSub({ status: "past_due", metadata: {} }) });

    await handleStripeEvent(event("customer.subscription.updated", { id: "sub_1" }), { stripe, admin });

    expect(tables.user_subscriptions).toHaveLength(1);
    expect(tables.user_subscriptions[0]).toMatchObject({ status: "past_due", plan: "basic" });
  });

  it("ignores a late event for an old subscription when a newer one is live", async () => {
    const { admin, tables } = fakeSupabase();
    tables.user_subscriptions.push({ user_id: "user_1", plan: "advanced", status: "active", stripe_subscription_id: "sub_new" });
    const stripe = fakeStripe({ sub_old: makeSub({ id: "sub_old", status: "canceled" }) });

    const result = await handleStripeEvent(event("customer.subscription.deleted", { id: "sub_old" }), { stripe, admin });

    expect(result).toBe("ignored_stale");
    expect(tables.user_subscriptions[0]).toMatchObject({ status: "active", stripe_subscription_id: "sub_new" });
  });

  it("lets a new checkout replace an old canceled subscription", async () => {
    const { admin, tables } = fakeSupabase();
    tables.user_subscriptions.push({ user_id: "user_1", plan: "basic", status: "canceled", stripe_subscription_id: "sub_old" });
    const stripe = fakeStripe({ sub_new: makeSub({ id: "sub_new", status: "incomplete" }) });
    const session = { mode: "subscription", subscription: "sub_new", client_reference_id: "user_1" };

    await handleStripeEvent(event("checkout.session.completed", session), { stripe, admin });

    expect(tables.user_subscriptions[0]).toMatchObject({ status: "incomplete", stripe_subscription_id: "sub_new" });
  });

  it("claims each event once and can release a claim for retry", async () => {
    const { admin } = fakeSupabase();
    const e = event("customer.subscription.updated", { id: "sub_1" });

    expect(await claimEvent(admin, e)).toBe("claimed");
    expect(await claimEvent(admin, e)).toBe("duplicate");
    await releaseEvent(admin, e.id);
    expect(await claimEvent(admin, e)).toBe("claimed");
  });
});
