import { NextResponse } from "next/server";
import { getStripeEnvStatus } from "@/lib/stripeEnv";

// GET /api/stripe/status
// Returns { enabled: boolean, missing: string[] }
// Used by the UI to gracefully disable billing flows when Stripe is not configured.
export async function GET() {
  return NextResponse.json(getStripeEnvStatus());
}
