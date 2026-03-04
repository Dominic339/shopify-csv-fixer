// src/lib/rateLimit.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getClientIp, rateLimit } from "./rateLimit";

// ---------------------------------------------------------------------------
// getClientIp
// ---------------------------------------------------------------------------

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/api/test", { headers });
}

describe("getClientIp", () => {
  it("returns x-forwarded-for first entry when present", () => {
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("trims whitespace from x-forwarded-for first entry", () => {
    const req = makeRequest({ "x-forwarded-for": "  10.0.0.1 , 10.0.0.2" });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("uses single-value x-forwarded-for", () => {
    const req = makeRequest({ "x-forwarded-for": "203.0.113.1" });
    expect(getClientIp(req)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip when x-forwarded-for absent", () => {
    const req = makeRequest({ "x-real-ip": "192.168.1.50" });
    expect(getClientIp(req)).toBe("192.168.1.50");
  });

  it("trims x-real-ip value", () => {
    const req = makeRequest({ "x-real-ip": "  172.16.0.5  " });
    expect(getClientIp(req)).toBe("172.16.0.5");
  });

  it("returns 'unknown' when no IP headers are present", () => {
    const req = makeRequest();
    expect(getClientIp(req)).toBe("unknown");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const req = makeRequest({
      "x-forwarded-for": "9.9.9.9",
      "x-real-ip": "8.8.8.8",
    });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });
});

// ---------------------------------------------------------------------------
// rateLimit — fail-open when Upstash env vars are absent
// ---------------------------------------------------------------------------

describe("rateLimit — fail-open", () => {
  let savedUrl: string | undefined;
  let savedToken: string | undefined;

  beforeEach(() => {
    // Ensure Upstash env vars are absent so the limiter is disabled.
    savedUrl = process.env.UPSTASH_REDIS_REST_URL;
    savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    // Restore original env (likely undefined in test env, but be safe).
    if (savedUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = savedUrl;
    else delete process.env.UPSTASH_REDIS_REST_URL;
    if (savedToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
    else delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("returns ok=true with reason=ratelimit_disabled_no_env when env vars absent", async () => {
    const req = makeRequest({ "x-forwarded-for": "1.1.1.1" });
    const result = await rateLimit(req);
    expect(result.ok).toBe(true);
    expect(result.reason).toBe("ratelimit_disabled_no_env");
  });

  it("returns limit=-1 and remaining=-1 when disabled", async () => {
    const req = makeRequest();
    const result = await rateLimit(req);
    expect(result.limit).toBe(-1);
    expect(result.remaining).toBe(-1);
    expect(result.reset).toBe(0);
  });

  it("accepts keyPrefix option without throwing", async () => {
    const req = makeRequest();
    const result = await rateLimit(req, { keyPrefix: "test" });
    expect(result.ok).toBe(true);
  });
});
