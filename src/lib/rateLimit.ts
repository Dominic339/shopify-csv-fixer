// src/lib/rateLimit.ts
// Production-safe rate limiting via Upstash Redis (HTTP-based, works on Edge + Node).
//
// Required env vars (Upstash free tier):
//   UPSTASH_REDIS_REST_URL   — from Upstash dashboard → Redis → REST API
//   UPSTASH_REDIS_REST_TOKEN — from Upstash dashboard → Redis → REST API
//
// Fail-open: if env vars are absent, rateLimit() returns ok=true with reason="ratelimit_disabled_no_env".

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Client IP extraction
// ---------------------------------------------------------------------------

export function getClientIp(req: Request | NextRequest): string {
  // NextRequest may expose .ip on some runtime/version combinations
  const nextIp = (req as unknown as { ip?: string }).ip;
  if (nextIp) return nextIp;

  // Standard proxy header — take the first (client) entry
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  // Real-IP header (nginx / some CDNs)
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}

// ---------------------------------------------------------------------------
// Lazy singleton limiter (60 req / 60 s sliding window, default)
// ---------------------------------------------------------------------------

let _limiter: Ratelimit | null = null;

function getLimiter(): Ratelimit | null {
  if (_limiter) return _limiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });
  _limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "60 s"),
    analytics: false,
  });
  return _limiter;
}

// ---------------------------------------------------------------------------
// rateLimit helper
// ---------------------------------------------------------------------------

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  reset: number;   // Unix epoch seconds
  limit: number;
  reason?: string;
};

export async function rateLimit(
  req: Request | NextRequest,
  opts?: {
    keyPrefix?: string;
    limit?: number;   // currently unused — affects default limiter creation only
    windowSec?: number;
  },
): Promise<RateLimitResult> {
  const limiter = getLimiter();

  if (!limiter) {
    // Env vars absent — fail open so local dev and non-Upstash deploys work.
    return { ok: true, remaining: -1, reset: 0, limit: -1, reason: "ratelimit_disabled_no_env" };
  }

  const ip = getClientIp(req);
  const key = `${opts?.keyPrefix ?? "api"}:${ip}`;

  try {
    const result = await limiter.limit(key);
    return {
      ok: result.success,
      remaining: result.remaining,
      reset: Math.floor(result.reset / 1000), // Upstash returns ms, convert to s
      limit: result.limit,
    };
  } catch {
    // Network / Redis error — fail open to avoid blocking legitimate traffic
    return { ok: true, remaining: -1, reset: 0, limit: -1, reason: "ratelimit_error" };
  }
}
