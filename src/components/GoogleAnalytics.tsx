"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Referrers seen only on bot traffic (hundreds of 0-second sessions from one city). */
const SPAM_REFERRERS = ["aocr.org"];

export default function GoogleAnalytics() {
  useEffect(() => {
    const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

    // No GA configured: do nothing.
    if (!GA_ID) return;

    // Prevent double-loading.
    if (document.getElementById("ga-loader")) return;

    // Keep automated traffic out of the reports: browsers driven by automation tools
    // (navigator.webdriver) and visits from known referral-spam sites.
    if (navigator.webdriver) return;
    if (SPAM_REFERRERS.some((d) => document.referrer.includes(d))) return;

    // Start Analytics on the visitor's first real interaction: moving the mouse, touching the
    // screen, a wheel scroll or a key press. Crawlers that run a full browser (hundreds of
    // one-page, 3-second "visits" from data centres, which navigator.webdriver doesn't catch)
    // never do any of these, so they stay out of the reports. Programmatic scrolling doesn't
    // count. gtag.js (about 150 KB) is only downloaded then, too.
    const EVENTS = ["pointermove", "pointerdown", "touchstart", "keydown", "wheel"] as const;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      for (const e of EVENTS) window.removeEventListener(e, start);
      // The queue and gtag() exist only from here, so trackEvent() is a no-op for a visitor
      // who hasn't interacted (and for crawlers); gtag.js reads the queue when it arrives.
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag() {
        // gtag.js reads real Arguments objects from the queue; a rest-parameter array would break tracking.
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer.push(arguments);
      };
      window.gtag("js", new Date());
      window.gtag("config", GA_ID);
      if (document.getElementById("ga-loader")) return;
      const s = document.createElement("script");
      s.id = "ga-loader";
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
      document.head.appendChild(s);
    };
    for (const e of EVENTS) window.addEventListener(e, start, { passive: true });
    return () => {
      for (const e of EVENTS) window.removeEventListener(e, start);
    };
  }, []);

  return null;
}
