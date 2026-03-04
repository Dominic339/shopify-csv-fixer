// src/lib/stripeEnv.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getStripeEnvStatus, getStripeSecretKey, getStripePublicKey } from "./stripeEnv";

describe("getStripeEnvStatus", () => {
  let savedSecretKey: string | undefined;

  beforeEach(() => {
    savedSecretKey = process.env.STRIPE_SECRET_KEY;
  });

  afterEach(() => {
    if (savedSecretKey !== undefined) process.env.STRIPE_SECRET_KEY = savedSecretKey;
    else delete process.env.STRIPE_SECRET_KEY;
  });

  it("returns enabled=false and missing=['STRIPE_SECRET_KEY'] when env var absent", () => {
    delete process.env.STRIPE_SECRET_KEY;
    const status = getStripeEnvStatus();
    expect(status.enabled).toBe(false);
    expect(status.missing).toContain("STRIPE_SECRET_KEY");
  });

  it("returns enabled=true and missing=[] when STRIPE_SECRET_KEY is set", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
    const status = getStripeEnvStatus();
    expect(status.enabled).toBe(true);
    expect(status.missing).toHaveLength(0);
  });
});

describe("getStripeSecretKey", () => {
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env.STRIPE_SECRET_KEY;
  });

  afterEach(() => {
    if (saved !== undefined) process.env.STRIPE_SECRET_KEY = saved;
    else delete process.env.STRIPE_SECRET_KEY;
  });

  it("returns null when STRIPE_SECRET_KEY is not set", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(getStripeSecretKey()).toBeNull();
  });

  it("returns the key value when STRIPE_SECRET_KEY is set", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    expect(getStripeSecretKey()).toBe("sk_test_abc");
  });
});

describe("getStripePublicKey", () => {
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  });

  afterEach(() => {
    if (saved !== undefined) process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = saved;
    else delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  });

  it("returns null when NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set", () => {
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    expect(getStripePublicKey()).toBeNull();
  });

  it("returns the key value when set", () => {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_xyz";
    expect(getStripePublicKey()).toBe("pk_test_xyz");
  });
});
