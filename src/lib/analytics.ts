declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (!window.gtag) return;

  window.gtag("event", name, params || {});
}

export function trackPageView(path: string) {
  if (typeof window === "undefined") return;
  if (!window.gtag) return;

  window.gtag("event", "page_view", { page_path: path });
}

// ── Internal DB analytics ────────────────────────────────────

const SESSION_KEY_LS = "striveformats_session_key_v1";

function getSessionKey(): string {
  if (typeof window === "undefined") return "ssr";
  let key = window.localStorage.getItem(SESSION_KEY_LS);
  if (!key) {
    key = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    window.localStorage.setItem(SESSION_KEY_LS, key);
  }
  return key;
}

/** GA4 event parameters take strings and numbers; anything else is turned into text or dropped. */
function gaParams(metadata: Record<string, unknown>, plan: string): Record<string, string | number> {
  const out: Record<string, string | number> = { plan };
  for (const [k, v] of Object.entries(metadata)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "string") out[k] = v.slice(0, 100);
    else if (typeof v === "boolean") out[k] = String(v);
  }
  return out;
}

/**
 * Records a tool event in our own database and in Google Analytics, so the funnel
 * (upload, validation, export, pass checkout) can be marked as key events in GA.
 */
export function trackToolEvent(
  eventName: string,
  metadata?: Record<string, unknown>,
  plan?: string,
): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", eventName, gaParams(metadata ?? {}, plan ?? "free"));
  } catch {
    // Analytics must never break the tool.
  }
  // fire-and-forget — never await, never throw
  fetch("/api/events/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      event_name: eventName,
      session_key: getSessionKey(),
      plan: plan ?? "free",
      metadata: metadata ?? {},
    }),
  }).catch(() => {});
}
