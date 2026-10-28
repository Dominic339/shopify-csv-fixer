// src/proxy.ts (Next.js 16 replacement for middleware.ts; runs on the Node.js runtime)
// 1. Rate-limits all /api/* routes (fail-open if Upstash not configured).
// 2. Locale redirect for home (/) and all localised page groups.
//
// NOTE: Supabase auth token refresh is intentionally not done here. Auth is
// handled per-route: API routes use Bearer tokens or cookies; page components
// use the browser client.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "./lib/rateLimit";
import { DEFAULT_LOCALE, isValidLocale, pickLocale } from "./lib/i18n/locales";
import { isLocalisedPath, LOCALE_COOKIE } from "./lib/i18n/paths";

// Exempt from rate limiting — verified by Stripe signature instead.
const RATE_LIMIT_EXEMPT = new Set(["/api/stripe/webhook"]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── API routes: rate limiting only ──────────────────────────────────────
  // No locale logic, no auth logic, no assumptions about browser context.
  if (pathname.startsWith("/api/")) {
    if (RATE_LIMIT_EXEMPT.has(pathname)) return NextResponse.next();

    let result;
    try {
      result = await rateLimit(req, { keyPrefix: "api" });
    } catch {
      // rateLimit already fails open internally, but guard the proxy
      // itself so a Redis/Upstash error never blocks a legitimate API call.
      return NextResponse.next();
    }

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

  // ── Locale redirect: all pages with [locale] route variants ─────────────
  // A language the visitor picked (cookie) wins. Without one, the device's language
  // (Accept-Language) is used on the first visit and remembered. English, or a
  // language we don't have, stays on the un-prefixed page.
  if (isLocalisedPath(pathname)) {
    try {
      const cookieValue = req.cookies.get(LOCALE_COOKIE)?.value;
      const cookieLocale = cookieValue && isValidLocale(cookieValue) ? cookieValue : null;
      const locale = cookieLocale ?? pickLocale(req.headers.get("accept-language"));
      if (locale && locale !== DEFAULT_LOCALE) {
        const url = req.nextUrl.clone();
        url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
        const res = NextResponse.redirect(url, { status: 307 });
        res.headers.set("Vary", "Accept-Language, Cookie");
        if (!cookieLocale) {
          res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
        }
        return res;
      }
    } catch {
      // Never let locale logic block a page request.
    }
  }

  return NextResponse.next();
}

export const config = {
  // Matcher: API routes + all page groups that have [locale] route variants.
  matcher: [
    "/api/:path*",
    "/",
    "/app",
    "/app/:path*",
    "/convert",
    "/merge",
    "/csv-inspector",
    "/profile",
    "/presets",
    "/presets/:path*",
    "/guides/:path*",
    "/shopify-csv-fixer",
    "/woocommerce-csv-fixer",
    "/woocommerce-variable-csv-fixer",
    "/etsy-csv-fixer",
    "/ebay-csv-fixer",
    "/ebay-variations-csv-fixer",
    "/amazon-csv-fixer",
  ],
};
