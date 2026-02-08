// src/lib/stripe/server.ts
import Stripe from "stripe";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} env var`);
  return v;
}

export const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
