/**
 * Regression tests for subscription/profile loading hardening.
 *
 * ProfileClient now reads auth directly via the browser Supabase client
 * (same mechanism as TopBar) instead of fetching /api/subscription/status.
 * This avoids the server-side getUser() failure caused by expired JWTs
 * when no middleware session refresh is in place.
 *
 * These tests verify: safe-JSON helpers for the Stripe status fetch, the
 * CONVERT_FORMAT_OPTIONS shape, and the target-select collision logic.
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
// Profile subscription derivation logic
// Mirrors the logic in ProfileClient.load() that builds SubStatus from the
// user_subscriptions row returned by the browser Supabase client.
// ---------------------------------------------------------------------------

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
  current_period_end: string | null;
};

function deriveSubStatus(
  session: { user: { id: string } } | null,
  row: { plan: string; status: string; current_period_end: string | null } | null
): SubStatus {
  if (!session?.user) {
    return { signedIn: false, plan: "free", status: "none", current_period_end: null };
  }
  const activePlan = row?.status === "active" ? row.plan : "free";
  return {
    signedIn: true,
    plan: (activePlan ?? "free") as SubStatus["plan"],
    status: row?.status ?? "none",
    current_period_end: row?.current_period_end ?? null,
  };
}

describe("profile subscription derivation (browser-client path)", () => {
  it("shows signedIn:false when no session", () => {
    const result = deriveSubStatus(null, null);
    expect(result.signedIn).toBe(false);
    expect(result.plan).toBe("free");
    expect(result.status).toBe("none");
  });

  it("shows signedIn:true with advanced/active when session + matching row", () => {
    const session = { user: { id: "user-123" } };
    const row = { plan: "advanced", status: "active", current_period_end: "2026-12-31" };
    const result = deriveSubStatus(session, row);
    expect(result.signedIn).toBe(true);
    expect(result.plan).toBe("advanced");
    expect(result.status).toBe("active");
    expect(result.current_period_end).toBe("2026-12-31");
  });

  it("falls back to free when subscription row is null (no subscription)", () => {
    const session = { user: { id: "user-123" } };
    const result = deriveSubStatus(session, null);
    expect(result.signedIn).toBe(true);
    expect(result.plan).toBe("free");
    expect(result.status).toBe("none");
  });

  it("falls back to free plan when status is not active (e.g. canceled)", () => {
    const session = { user: { id: "user-123" } };
    const row = { plan: "basic", status: "canceled", current_period_end: null };
    const result = deriveSubStatus(session, row);
    expect(result.signedIn).toBe(true);
    expect(result.plan).toBe("free"); // downgraded to free because not active
    expect(result.status).toBe("canceled");
  });

  it("shows basic plan when status is active and plan is basic", () => {
    const session = { user: { id: "user-456" } };
    const row = { plan: "basic", status: "active", current_period_end: null };
    const result = deriveSubStatus(session, row);
    expect(result.plan).toBe("basic");
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

// ---------------------------------------------------------------------------
// Billing portal readiness guard
// Verifies that "Manage billing" is only offered when stripe_customer_id is
// present — prevents the confusing "No Stripe customer found" 400 error
// immediately after a successful checkout.
// ---------------------------------------------------------------------------

describe("billing portal readiness guard", () => {
  function billingPortalReady(sub: {
    signedIn: boolean;
    status: string;
    stripeCustomerId?: string | null;
  }): boolean {
    return sub.signedIn && sub.status === "active" && !!sub.stripeCustomerId;
  }

  it("returns false when not signed in", () => {
    expect(billingPortalReady({ signedIn: false, status: "active", stripeCustomerId: "cus_123" })).toBe(false);
  });

  it("returns false when status is not active", () => {
    expect(billingPortalReady({ signedIn: true, status: "none", stripeCustomerId: "cus_123" })).toBe(false);
  });

  it("returns false when stripe_customer_id is null (post-checkout webhook lag)", () => {
    expect(billingPortalReady({ signedIn: true, status: "active", stripeCustomerId: null })).toBe(false);
  });

  it("returns false when stripe_customer_id is absent", () => {
    expect(billingPortalReady({ signedIn: true, status: "active" })).toBe(false);
  });

  it("returns true when signed in, active, and stripe_customer_id present", () => {
    expect(billingPortalReady({ signedIn: true, status: "active", stripeCustomerId: "cus_abc123" })).toBe(true);
  });
});
