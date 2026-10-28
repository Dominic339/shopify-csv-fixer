// src/lib/passCheckout.ts
// Browser helpers for buying the 24-hour pass from inside a tool.
//
// Buying means leaving the page twice at worst (sign-in, then Stripe), so the
// tool stashes the file it is working on and picks it up again on return.
"use client";

import { createClient } from "@/lib/supabase/browser";

export type PassCheckoutResult = "redirected" | "signin" | "unavailable" | "error";

/** Send a signed-in user to Stripe Checkout for the pass. */
export async function startPassCheckout(): Promise<PassCheckoutResult> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return "signin";

    const r = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ plan: "pass" }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) return "signin";
    if (j?.error === "stripe_not_configured") return "unavailable";
    if (!r.ok || !j?.url) return "error";

    window.location.href = j.url;
    return "redirected";
  } catch {
    return "error";
  }
}

/** Login URL that brings the user back to the current page. */
export function loginHrefForHere(): string {
  return `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
}

// ── Pending file ──────────────────────────────────────────────────────────

// localStorage rather than sessionStorage: a magic-link sign-in opens a new tab.
const PENDING_KEY = "striveformats_pending_file_v1";
const PENDING_MAX_AGE_MS = 2 * 3600_000;

export type PendingFile = { tool: string; formatId: string; name: string; text: string; at: number };

/** Remember a file across the checkout round trip. Returns false if it doesn't fit. */
export function stashPendingFile(file: Omit<PendingFile, "at">): boolean {
  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify({ ...file, at: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

/** Take back a stashed file for `tool`, if a recent one exists. */
export function takePendingFile(tool: string): PendingFile | null {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingFile;
    if (p.tool !== tool) return null;
    window.localStorage.removeItem(PENDING_KEY);
    if (Date.now() - Number(p.at) > PENDING_MAX_AGE_MS) return null;
    return typeof p.text === "string" ? p : null;
  } catch {
    return null;
  }
}

export function clearPendingFile() {
  try {
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}
