// src/middleware.ts
// 1. Rate-limits all /api/* routes.
// 2. Locale redirect for home (/) and guides (/guides/*) — the only pages that
//    have translated versions under /[locale]/.  All other routes (app pages,
//    profile, auth, etc.) pass through unchanged so auth cookies are never
//    disrupted by a redirect.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "./lib/rateLimit";
import { DEFAULT_LOCALE, isValidLocale } from "./lib/i18n/locales";

// Exempt from rate limiting — verified by Stripe signature instead.
const RATE_LIMIT_EXEMPT = new Set(["/api/stripe/webhook"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── API routes: rate limiting only ──────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    if (RATE_LIMIT_EXEMPT.has(pathname)) return NextResponse.next();

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

  // ── Locale redirect: home and guides only ───────────────────────────────
  // Only redirect if the user has a non-English locale cookie AND the current
  // path is one of the pages that actually has a translated version.
  const isLocalisable = pathname === "/" || pathname.startsWith("/guides");
  if (isLocalisable) {
    const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
    if (cookieLocale && isValidLocale(cookieLocale) && cookieLocale !== DEFAULT_LOCALE) {
      const url = req.nextUrl.clone();
      url.pathname = `/${cookieLocale}${pathname === "/" ? "" : pathname}`;
      return NextResponse.redirect(url, { status: 307 });
    }
  }

  return NextResponse.next();
}

export const config = {
  // Match API routes + the two page-route groups that need locale redirect.
  // Everything else (app, profile, auth, convert, merge, …) is untouched.
  matcher: ["/api/:path*", "/", "/guides/:path*"],
};
