// src/lib/stripeEnv.ts
// Safe, centralized access to Stripe environment variables.
// Never throws — callers must check .enabled before using keys.

export type StripeEnvStatus = {
  enabled: boolean;
  /** Names of required env vars that are absent. */
  missing: string[];
};

const REQUIRED = ["STRIPE_SECRET_KEY"] as const;

export function getStripeEnvStatus(): StripeEnvStatus {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  return { enabled: missing.length === 0, missing };
}

/** Returns the Stripe secret key, or null if not set. */
export function getStripeSecretKey(): string | null {
  return process.env.STRIPE_SECRET_KEY ?? null;
}

/** Returns the Stripe publishable key, or null if not set. */
export function getStripePublicKey(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;
}
