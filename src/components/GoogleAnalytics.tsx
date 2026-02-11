"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

export default function GoogleAnalytics() {
  useEffect(() => {
    const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

    // No GA configured: do nothing.
    if (!GA_ID) return;

    // Prevent double-loading.
    if (document.getElementById("ga-loader")) return;

    // Load gtag.js
    const s = document.createElement("script");
    s.id = "ga-loader";
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);

    // Init
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    window.gtag("js", new Date());
    window.gtag("config", GA_ID);
  }, []);

  return null;
}
