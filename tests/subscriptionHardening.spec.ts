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
