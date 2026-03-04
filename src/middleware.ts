// src/middleware.ts
// Applies rate limiting to all /api/* routes.
// Stripe webhook (/api/stripe/webhook) is intentionally exempt here — it is
// verified by Stripe signature inside the handler, which is a stronger guarantee
// than IP-based rate limiting, and Stripe's retry pool can share IP ranges.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "./lib/rateLimit";

// Exempt paths — verified by other mechanisms (signature, etc.)
const RATE_LIMIT_EXEMPT = new Set(["/api/stripe/webhook"]);

export async function middleware(req: NextRequest) {
  if (RATE_LIMIT_EXEMPT.has(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const result = await rateLimit(req, { keyPrefix: "api" });

  if (!result.ok) {
    const retryAfter = Math.max(0, result.reset - Math.floor(Date.now() / 1000));
    return new NextResponse(
      JSON.stringify({ error: "rate_limited", retryAfter }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(result.reset),
        },
      },
    );
  }

  const res = NextResponse.next();
  if (result.limit > 0) {
    res.headers.set("X-RateLimit-Limit", String(result.limit));
    res.headers.set("X-RateLimit-Remaining", String(result.remaining));
    res.headers.set("X-RateLimit-Reset", String(result.reset));
  }
  return res;
}

export const config = {
  // Only intercept /api/* — never page routes, guides, or static assets
  matcher: ["/api/:path*"],
};
