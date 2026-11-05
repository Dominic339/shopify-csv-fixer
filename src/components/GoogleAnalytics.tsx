"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
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

    // Init the queue now so nothing is lost; gtag.js reads it when it arrives.
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // gtag.js reads real Arguments objects from the queue; a rest-parameter array would break tracking.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };

    // Load gtag.js (about 150 KB) only once the page has loaded and the browser is idle,
    // so it doesn't compete with the page's own JavaScript.
    const load = () => {
      if (document.getElementById("ga-loader")) return;
      const s = document.createElement("script");
      s.id = "ga-loader";
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
      document.head.appendChild(s);
    };
    const whenIdle = () => {
      // Safari has no requestIdleCallback.
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(load, { timeout: 4000 });
      else window.setTimeout(load, 1500);
    };
    if (document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true });

    window.gtag("js", new Date());
    window.gtag("config", GA_ID);
  }, []);

  return null;
}
