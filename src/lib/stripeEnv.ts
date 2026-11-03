// src/lib/stripeEnv.ts
// Safe, centralized access to Stripe environment variables.
// Never throws — callers must check .enabled before using keys.

export type StripeEnvStatus = {
  enabled: boolean;
  /** Names of required env vars that are absent. */
  missing: string[];
  /** Which checkout prices are configured; a plan without a price can't be bought. */
  prices: { basic: boolean; advanced: boolean; pass: boolean };
};

const REQUIRED = ["STRIPE_SECRET_KEY"] as const;

export function getStripeEnvStatus(): StripeEnvStatus {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  const enabled = missing.length === 0;
  const has = (k: string) => enabled && Boolean(process.env[k]);
  return {
    enabled,
    missing,
    prices: { basic: has("STRIPE_PRICE_BASIC"), advanced: has("STRIPE_PRICE_ADVANCED"), pass: has("STRIPE_PRICE_PASS") },
  };
}

/** Returns the Stripe secret key, or null if not set. */
export function getStripeSecretKey(): string | null {
  return process.env.STRIPE_SECRET_KEY ?? null;
}

/** Returns the Stripe publishable key, or null if not set. */
export function getStripePublicKey(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;
}
