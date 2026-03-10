// src/middleware.ts
// 1. Refreshes Supabase auth tokens so server-side getUser() works correctly.
// 2. Rate-limits all /api/* routes.
// 3. Locale redirect for home (/) and guides (/guides/*) — the only pages that
//    have translated versions under /[locale]/.  All other routes (app pages,
//    profile, auth, etc.) pass through unchanged so auth cookies are never
//    disrupted by a redirect.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { rateLimit } from "./lib/rateLimit";
import { DEFAULT_LOCALE, isValidLocale } from "./lib/i18n/locales";

// Exempt from rate limiting — verified by Stripe signature instead.
const RATE_LIMIT_EXEMPT = new Set(["/api/stripe/webhook"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Supabase auth token refresh ─────────────────────────────────────────
  // Refreshes the session cookie so server-side supabase.auth.getUser() calls
  // in API routes and Server Components always see a valid, non-expired token.
  // Without this, the access token expires after ~1 hour and server-side auth
  // returns null even while the browser session remains active.
  let res = NextResponse.next({ request: req });

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value } of cookiesToSet) {
              req.cookies.set(name, value);
            }
            res = NextResponse.next({ request: req });
            for (const { name, value, options } of cookiesToSet) {
              res.cookies.set(name, value, options);
            }
          },
        },
      });
      // Refresh session — updates cookies if the token was rotated.
      await supabase.auth.getUser();
    }
  } catch {
    // Never block the request if auth refresh fails.
  }

  // ── API routes: rate limiting only ──────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    if (RATE_LIMIT_EXEMPT.has(pathname)) return res;

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

  return res;
}

export const config = {
  // Match all routes except Next.js internals and static files.
  // Auth refresh must run on every request so server-side getUser() always works.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
