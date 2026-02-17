// src/lib/validation/strictMode.ts

/**
 * Strict Mode is a user preference (per-browser) that enables extra Shopify checks.
 *
 * IMPORTANT:
 * - Safe to import in server contexts (no window access at module scope).
 * - The UI is responsible for gating Strict Mode behind the Advanced plan.
 */

const KEY = "striveformats_strict_shopify_v1";

export function getStrictMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "1" || v === "true";
  } catch {
    return false;
  }
}

export function setStrictMode(next: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, next ? "1" : "0");
  } catch {
    // ignore
  }
}
