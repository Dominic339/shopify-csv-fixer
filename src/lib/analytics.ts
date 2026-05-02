declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function trackEvent(name: string, params?: Record<string, any>) {
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

export function trackToolEvent(
  eventName: string,
  metadata?: Record<string, unknown>,
  plan?: string,
): void {
  if (typeof window === "undefined") return;
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
