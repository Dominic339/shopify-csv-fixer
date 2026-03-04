// src/app/api/stripe/status/route.test.ts
// Unit test: verify the status route returns getStripeEnvStatus output.
// We test the underlying function directly since the route is a thin wrapper.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getStripeEnvStatus } from "@/lib/stripeEnv";

describe("/api/stripe/status route — getStripeEnvStatus integration", () => {
  let savedKey: string | undefined;

  beforeEach(() => {
    savedKey = process.env.STRIPE_SECRET_KEY;
  });

  afterEach(() => {
    if (savedKey !== undefined) process.env.STRIPE_SECRET_KEY = savedKey;
    else delete process.env.STRIPE_SECRET_KEY;
  });

  it("returns enabled=false when STRIPE_SECRET_KEY is absent", () => {
    delete process.env.STRIPE_SECRET_KEY;
    const status = getStripeEnvStatus();
    expect(status.enabled).toBe(false);
    expect(status.missing).toContain("STRIPE_SECRET_KEY");
  });

  it("returns enabled=true when STRIPE_SECRET_KEY is present", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_example";
    const status = getStripeEnvStatus();
    expect(status.enabled).toBe(true);
    expect(status.missing).toHaveLength(0);
  });

  it("missing array is empty when Stripe is configured", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_example";
    const { missing } = getStripeEnvStatus();
    expect(missing).toEqual([]);
  });
});
