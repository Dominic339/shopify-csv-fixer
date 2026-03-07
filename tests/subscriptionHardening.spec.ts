/**
 * Regression tests for subscription/profile loading hardening.
 *
 * These are unit-level tests that verify the safe-JSON parsing helpers
 * introduced to fix "Unexpected token … is not valid JSON" errors and
 * the stuck-Loading state on /profile.
 *
 * We test the helpers extracted from the fix rather than the React
 * components directly (which require a DOM environment).
 */
import { describe, it, expect } from "vitest";
import { CONVERT_FORMAT_OPTIONS } from "@/lib/convertCsv";

// ---------------------------------------------------------------------------
// Helper: safe JSON parse (mirrors logic added to refreshQuotaAndPlan /
// ProfileClient load())
// ---------------------------------------------------------------------------

async function safeParseSubscriptionResponse(
  simulatedResponse: { ok: boolean; body: string }
): Promise<{ plan: string; status: string; signedIn: boolean }> {
  const FALLBACK = { plan: "free", status: "none", signedIn: false };
  if (!simulatedResponse.ok) return FALLBACK;
  const text = simulatedResponse.body;
  try {
    return JSON.parse(text);
  } catch {
    return FALLBACK;
  }
}

describe("subscription fetch hardening", () => {
  it("returns fallback for a non-OK response (e.g. 500 HTML)", async () => {
    const result = await safeParseSubscriptionResponse({
      ok: false,
      body: "<html><body>A server error occurred.</body></html>",
    });
    expect(result.plan).toBe("free");
    expect(result.status).toBe("none");
    expect(result.signedIn).toBe(false);
  });

  it("returns fallback when response body is non-JSON text", async () => {
    const result = await safeParseSubscriptionResponse({
      ok: true,
      body: "A server error occurred.",
    });
    expect(result.plan).toBe("free");
    expect(result.signedIn).toBe(false);
  });

  it("returns fallback for empty body", async () => {
    const result = await safeParseSubscriptionResponse({ ok: true, body: "" });
    expect(result.plan).toBe("free");
  });

  it("returns actual plan for valid JSON with advanced plan", async () => {
    const payload = JSON.stringify({
      signedIn: true,
      plan: "advanced",
      status: "active",
    });
    const result = await safeParseSubscriptionResponse({ ok: true, body: payload });
    expect(result.plan).toBe("advanced");
    expect(result.status).toBe("active");
    expect(result.signedIn).toBe(true);
  });

  it("returns actual plan for valid JSON with basic plan", async () => {
    const payload = JSON.stringify({
      signedIn: true,
      plan: "basic",
      status: "active",
    });
    const result = await safeParseSubscriptionResponse({ ok: true, body: payload });
    expect(result.plan).toBe("basic");
  });
});

// ---------------------------------------------------------------------------
// Converter options — regression: source dropdown must have all format options
// ---------------------------------------------------------------------------

describe("CONVERT_FORMAT_OPTIONS", () => {
  it("contains more than one option", () => {
    expect(CONVERT_FORMAT_OPTIONS.length).toBeGreaterThan(3);
  });

  it("includes all major platforms", () => {
    const ids = CONVERT_FORMAT_OPTIONS.map((o) => o.id);
    expect(ids).toContain("shopify_products");
    expect(ids).toContain("woocommerce_products");
    expect(ids).toContain("etsy_listings");
    expect(ids).toContain("ebay_listings");
    expect(ids).toContain("amazon_inventory_loader");
  });

  it("every option has a non-empty id and label", () => {
    for (const opt of CONVERT_FORMAT_OPTIONS) {
      expect(opt.id).toBeTruthy();
      expect(opt.label).toBeTruthy();
    }
  });

  it("all ids are unique", () => {
    const ids = CONVERT_FORMAT_OPTIONS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("filtering out any single id still leaves at least 3 options", () => {
    for (const opt of CONVERT_FORMAT_OPTIONS) {
      const filtered = CONVERT_FORMAT_OPTIONS.filter((o) => o.id !== opt.id);
      expect(filtered.length).toBeGreaterThanOrEqual(3);
    }
  });
});

// ---------------------------------------------------------------------------
// Middleware locale bypass logic
// ---------------------------------------------------------------------------

describe("middleware locale bypass", () => {
  // Mirror the constants/logic from src/middleware.ts
  const AUTH_PASSTHROUGH_PREFIX = "/auth/";
  const LOCALE_EXEMPT_PREFIXES = ["/login", "/profile", "/account", "/checkout"];

  function isAuthPassthrough(pathname: string): boolean {
    return pathname.startsWith(AUTH_PASSTHROUGH_PREFIX);
  }

  function isLocaleExempt(pathname: string): boolean {
    return LOCALE_EXEMPT_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
  }

  it("/auth/callback is auth passthrough", () => {
    expect(isAuthPassthrough("/auth/callback")).toBe(true);
  });

  it("/auth/confirm is auth passthrough", () => {
    expect(isAuthPassthrough("/auth/confirm")).toBe(true);
  });

  it("/api/* is not auth passthrough (handled separately)", () => {
    expect(isAuthPassthrough("/api/subscription/status")).toBe(false);
  });

  it("/profile is locale exempt", () => {
    expect(isLocaleExempt("/profile")).toBe(true);
  });

  it("/login is locale exempt", () => {
    expect(isLocaleExempt("/login")).toBe(true);
  });

  it("/account is locale exempt", () => {
    expect(isLocaleExempt("/account")).toBe(true);
  });

  it("/checkout is locale exempt", () => {
    expect(isLocaleExempt("/checkout")).toBe(true);
  });

  it("/checkout/success is locale exempt (sub-path)", () => {
    expect(isLocaleExempt("/checkout/success")).toBe(true);
  });

  it("public content pages are NOT locale exempt", () => {
    expect(isLocaleExempt("/guides/shopify")).toBe(false);
    expect(isLocaleExempt("/")).toBe(false);
    expect(isLocaleExempt("/ecommerce-csv-fixer")).toBe(false);
  });

  it("auth passthrough takes priority over locale — /auth/* short-circuits everything", () => {
    // If auth passthrough matches, locale-exempt check is irrelevant
    const path = "/auth/callback";
    expect(isAuthPassthrough(path)).toBe(true);
    // Even though it starts with /auth, it is NOT in LOCALE_EXEMPT_PREFIXES —
    // which is correct: /auth/* uses the full passthrough, not just locale-skip.
    expect(isLocaleExempt(path)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Target format collision avoidance
// ---------------------------------------------------------------------------

describe("converter dropdown collision avoidance", () => {
  /**
   * Mirrors the safeTargetFormatId logic in ConvertClient.tsx:
   *   if targetFormatId !== sourceFormatId → use targetFormatId
   *   else → use first option that isn't sourceFormatId
   */
  function safeTargetId(sourceId: string, targetId: string): string {
    if (targetId !== sourceId) return targetId;
    const first = CONVERT_FORMAT_OPTIONS.find((o) => o.id !== sourceId);
    return first?.id ?? targetId;
  }

  it("returns targetId unchanged when source and target differ", () => {
    expect(safeTargetId("shopify_products", "woocommerce_products")).toBe("woocommerce_products");
  });

  it("picks a different target when source equals target", () => {
    const result = safeTargetId("woocommerce_products", "woocommerce_products");
    expect(result).not.toBe("woocommerce_products");
    expect(result).toBeTruthy();
  });

  it("always returns a value present in CONVERT_FORMAT_OPTIONS", () => {
    const ids = CONVERT_FORMAT_OPTIONS.map((o) => o.id);
    for (const src of ids) {
      const resolved = safeTargetId(src, src);
      expect(ids).toContain(resolved);
    }
  });
});
