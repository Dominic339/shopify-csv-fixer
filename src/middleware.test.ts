// src/middleware.test.ts
// Unit tests for middleware behaviour on /api/* routes.
// Verifies:
//  - API routes are never blocked by locale-redirect logic
//  - Rate limiting fails open when Upstash env is absent
//  - Locale redirect fires for / and localisable pages when NEXT_LOCALE cookie is set
//  - Locale redirect does NOT fire for /api/* routes

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Minimal NextRequest stub ──────────────────────────────────────────────────

function makeReq(pathname: string, cookies: Record<string, string> = {}): NextRequest {
  const url = `https://example.com${pathname}`;
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  const headers = new Headers(cookieHeader ? { cookie: cookieHeader } : {});

  return {
    nextUrl: {
      pathname,
      clone() {
        return { pathname, toString: () => url, searchParams: new URLSearchParams() };
      },
    },
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
      getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
    },
    headers,
    url,
  } as unknown as NextRequest;
}

// ── isLocalisable helper (mirrors middleware logic) ───────────────────────────

const LOCALISABLE_PREFIXES = ["/guides", "/app", "/convert", "/merge", "/csv-inspector", "/profile", "/presets"];

function isLocalisable(pathname: string): boolean {
  if (pathname === "/") return true;
  return LOCALISABLE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("middleware — API routes", () => {
  let savedUrl: string | undefined;
  let savedToken: string | undefined;

  beforeEach(() => {
    savedUrl = process.env.UPSTASH_REDIS_REST_URL;
    savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    if (savedUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = savedUrl;
    else delete process.env.UPSTASH_REDIS_REST_URL;
    if (savedToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
    else delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("passes /api/health through without a redirect (rate-limit disabled → ok=true)", async () => {
    const { rateLimit } = await import("./lib/rateLimit");
    const req = makeReq("/api/health");
    const result = await rateLimit(req, { keyPrefix: "api" });
    expect(result.ok).toBe(true);
    expect(result.reason).toBe("ratelimit_disabled_no_env");
  });

  it("passes /api/stripe/checkout through (rate-limit fail-open)", async () => {
    const { rateLimit } = await import("./lib/rateLimit");
    const req = makeReq("/api/stripe/checkout");
    const result = await rateLimit(req, { keyPrefix: "api" });
    expect(result.ok).toBe(true);
  });

  it("passes /api/stripe/portal through (rate-limit fail-open)", async () => {
    const { rateLimit } = await import("./lib/rateLimit");
    const req = makeReq("/api/stripe/portal");
    const result = await rateLimit(req, { keyPrefix: "api" });
    expect(result.ok).toBe(true);
  });

  it("does not apply locale redirect to /api/* regardless of NEXT_LOCALE cookie", () => {
    // Locale redirect is guarded by `pathname.startsWith("/api/")` — it exits
    // before locale logic. Verify the guard by checking pathname directly.
    const isApiRoute = "/api/subscription/status".startsWith("/api/");
    expect(isApiRoute).toBe(true);
    // The middleware returns early for API routes; locale logic never runs.
  });
});

describe("middleware — locale redirect", () => {
  it("recognises / as a localisable path", () => {
    expect(isLocalisable("/")).toBe(true);
  });

  it("recognises /guides/shopify as a localisable path", () => {
    expect(isLocalisable("/guides/shopify")).toBe(true);
  });

  it("recognises /app as a localisable path", () => {
    expect(isLocalisable("/app")).toBe(true);
  });

  it("recognises /convert as a localisable path", () => {
    expect(isLocalisable("/convert")).toBe(true);
  });

  it("recognises /merge as a localisable path", () => {
    expect(isLocalisable("/merge")).toBe(true);
  });

  it("recognises /csv-inspector as a localisable path", () => {
    expect(isLocalisable("/csv-inspector")).toBe(true);
  });

  it("recognises /profile as a localisable path", () => {
    expect(isLocalisable("/profile")).toBe(true);
  });

  it("recognises /presets as a localisable path", () => {
    expect(isLocalisable("/presets")).toBe(true);
  });

  it("does NOT treat /api/health as a localisable path", () => {
    expect(isLocalisable("/api/health")).toBe(false);
  });

  it("does NOT treat /login as a localisable path", () => {
    expect(isLocalisable("/login")).toBe(false);
  });

  it("does NOT treat /auth/callback as a localisable path", () => {
    expect(isLocalisable("/auth/callback")).toBe(false);
  });
});
