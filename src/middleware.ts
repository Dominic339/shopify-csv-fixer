// src/middleware.ts
// 1. Applies rate limiting to all /api/* routes.
// 2. Auth routes (/auth/*) pass through untouched — the callback handler must
//    run exchangeCodeForSession() without any redirect interference.
// 3. Refreshes Supabase auth session so server-side getUser() reads valid cookies.
// 4. Handles locale detection and redirects for public page routes.
//    - Auth-sensitive routes (login, profile, account, checkout) are exempt from
//      locale redirects — they only get the session refresh and then pass through.
//    - /en/* → redirects to /* (canonical English at root)
//    - First-time visitors: detects Accept-Language and redirects to /<locale>/
//    - Locale preference persisted via NEXT_LOCALE cookie

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { rateLimit } from "./lib/rateLimit";
import { LOCALES, DEFAULT_LOCALE, isValidLocale } from "./lib/i18n/locales";
import type { Locale } from "./lib/i18n/locales";

// Exempt paths — verified by other mechanisms (signature, etc.)
const RATE_LIMIT_EXEMPT = new Set(["/api/stripe/webhook"]);

// Auth-sensitive page route prefixes that must NOT receive locale redirects.
// These routes either establish the session (callback) or require the real
// session to be present (profile, login) — a locale redirect would lose the
// auth code parameter or break the cookie exchange flow.
const AUTH_PASSTHROUGH_PREFIX = "/auth/"; // full passthrough — no session refresh either
const LOCALE_EXEMPT_PREFIXES = ["/login", "/profile", "/account", "/checkout"];

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
  // 0. Auth callback routes — full passthrough, no interference whatsoever.
  //    exchangeCodeForSession() in /auth/callback/route.ts must receive the
  //    request exactly as-is; any redirect here would drop the `code` param
  //    and prevent the server-side session cookie from being set.
  // -------------------------------------------------------------------------
  if (pathname.startsWith(AUTH_PASSTHROUGH_PREFIX)) {
    return NextResponse.next();
  }

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
  // 2. Page routes — Supabase session refresh + locale handling
  // -------------------------------------------------------------------------

  // Refresh the Supabase auth session so that server-side supabase.auth.getUser()
  // in API routes and Server Components can read a valid session from cookies.
  // Per @supabase/ssr docs, this must run in middleware on every page request.
  let supabaseRes = NextResponse.next({ request: req });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Apply refreshed cookies to both the request and the response.
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          supabaseRes = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseRes.cookies.set(name, value, options)
          );
        },
      },
    });
    // This call refreshes the session token if it has expired.
    await supabase.auth.getUser();
  }

  // Helper: copy Supabase session cookies onto redirect/other responses.
  // Per @supabase/ssr docs, any response we return must carry the refreshed cookies.
  function withSessionCookies(response: NextResponse): NextResponse {
    supabaseRes.cookies.getAll().forEach(({ name, value }) => {
      response.cookies.set(name, value);
    });
    return response;
  }

  // -------------------------------------------------------------------------
  // Auth-adjacent routes — session refresh already done above; skip locale
  // redirects entirely so login, profile, account, and checkout always render
  // their English handlers without being bounced to /<locale>/* first.
  // -------------------------------------------------------------------------
  if (LOCALE_EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return supabaseRes;
  }

  // /en/* → redirect to /* (English is canonical at root, no /en/ prefix)
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const rest = pathname.slice(3); // strip "/en"
    const url = req.nextUrl.clone();
    url.pathname = rest || "/";
    return withSessionCookies(NextResponse.redirect(url, { status: 308 }));
  }

  // Check if path starts with a known non-English locale segment
  // e.g. /es/guides/... → first segment is "es"
  const firstSegment = pathname.split("/")[1];
  if (firstSegment && isValidLocale(firstSegment) && firstSegment !== DEFAULT_LOCALE) {
    // Already on a localized route — just pass through, setting the cookie
    supabaseRes.cookies.set("NEXT_LOCALE", firstSegment, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return supabaseRes;
  }

  // Root-level English page — check if this is a first-time visitor who
  // prefers a non-English locale, and if so redirect them.
  // Skip redirect if they already have a cookie or sent the locale in URL.
  const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && isValidLocale(cookieLocale) && cookieLocale !== DEFAULT_LOCALE) {
    // User has previously chosen a non-English locale → redirect
    const url = req.nextUrl.clone();
    url.pathname = `/${cookieLocale}${pathname === "/" ? "" : pathname}`;
    return withSessionCookies(NextResponse.redirect(url, { status: 307 }));
  }

  // No cookie: detect from Accept-Language
  if (!cookieLocale) {
    const detected = detectLocale(req.headers.get("accept-language"));
    if (detected !== DEFAULT_LOCALE) {
      const url = req.nextUrl.clone();
      url.pathname = `/${detected}${pathname === "/" ? "" : pathname}`;
      const redirectRes = withSessionCookies(NextResponse.redirect(url, { status: 307 }));
      redirectRes.cookies.set("NEXT_LOCALE", detected, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
      return redirectRes;
    }
    // Detected English — set cookie so we don't check again
    supabaseRes.cookies.set("NEXT_LOCALE", DEFAULT_LOCALE, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return supabaseRes;
  }

  return supabaseRes;
}

export const config = {
  matcher: [
    // Match all page routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)).*)",
  ],
};
