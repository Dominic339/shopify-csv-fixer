// src/middleware.ts
// 1. Applies rate limiting to all /api/* routes.
// 2. Handles locale detection and redirects for page routes.
//    - /en/* → redirects to /* (canonical English at root)
//    - First-time visitors: detects Accept-Language and redirects to /<locale>/
//    - Locale preference persisted via NEXT_LOCALE cookie

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "./lib/rateLimit";
import { LOCALES, DEFAULT_LOCALE, isValidLocale } from "./lib/i18n/locales";
import type { Locale } from "./lib/i18n/locales";

// Exempt paths — verified by other mechanisms (signature, etc.)
const RATE_LIMIT_EXEMPT = new Set(["/api/stripe/webhook"]);

// ---------------------------------------------------------------------------
// Locale detection helpers
// ---------------------------------------------------------------------------

/** Parse Accept-Language header and return the best matching locale. */
function detectLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  // Parse header: "es-MX,es;q=0.9,en;q=0.8"
  const tags = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.trim().toLowerCase(), q: q ? parseFloat(q) : 1.0 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of tags) {
    // Try exact match first (e.g. "es")
    if (isValidLocale(tag)) return tag;
    // Try language prefix (e.g. "es" from "es-mx")
    const lang = tag.split("-")[0];
    if (isValidLocale(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // -------------------------------------------------------------------------
  // 1. API routes — rate limiting only
  // -------------------------------------------------------------------------
  if (pathname.startsWith("/api/")) {
    if (RATE_LIMIT_EXEMPT.has(pathname)) {
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

  // -------------------------------------------------------------------------
  // 2. Page routes — locale handling
  // -------------------------------------------------------------------------

  // /en/* → redirect to /* (English is canonical at root, no /en/ prefix)
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const rest = pathname.slice(3); // strip "/en"
    const url = req.nextUrl.clone();
    url.pathname = rest || "/";
    return NextResponse.redirect(url, { status: 308 });
  }

  // Check if path starts with a known non-English locale segment
  // e.g. /es/guides/... → first segment is "es"
  const firstSegment = pathname.split("/")[1];
  if (firstSegment && isValidLocale(firstSegment) && firstSegment !== DEFAULT_LOCALE) {
    // Already on a localized route — just pass through, setting the cookie
    const res = NextResponse.next();
    res.cookies.set("NEXT_LOCALE", firstSegment, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return res;
  }

  // Root-level English page — check if this is a first-time visitor who
  // prefers a non-English locale, and if so redirect them.
  // Skip redirect if they already have a cookie or sent the locale in URL.
  const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && isValidLocale(cookieLocale) && cookieLocale !== DEFAULT_LOCALE) {
    // User has previously chosen a non-English locale → redirect
    const url = req.nextUrl.clone();
    url.pathname = `/${cookieLocale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url, { status: 307 });
  }

  // No cookie: detect from Accept-Language
  if (!cookieLocale) {
    const detected = detectLocale(req.headers.get("accept-language"));
    if (detected !== DEFAULT_LOCALE) {
      const url = req.nextUrl.clone();
      url.pathname = `/${detected}${pathname === "/" ? "" : pathname}`;
      const redirectRes = NextResponse.redirect(url, { status: 307 });
      redirectRes.cookies.set("NEXT_LOCALE", detected, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
      return redirectRes;
    }
    // Detected English — set cookie so we don't check again
    const res = NextResponse.next();
    res.cookies.set("NEXT_LOCALE", DEFAULT_LOCALE, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all page routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)).*)",
  ],
};
