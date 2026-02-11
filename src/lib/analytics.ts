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
