"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

export default function Analytics() {
  useEffect(() => {
    const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

    // If no GA ID is configured, do nothing (safe for dev + builds).
    if (!GA_ID) return;

    // Prevent loading twice if component mounts again for any reason.
    if (document.getElementById("ga-loader")) return;

    // Create and append the external gtag script
    const s = document.createElement("script");
    s.id = "ga-loader";
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);

    // Initialize the dataLayer + gtag function
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    // Configure GA
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, {
      // Keeps GA from automatically firing a page_view if you ever add a router tracker.
      // Safe to keep or remove; doesn't break anything.
      send_page_view: true,
    });
  }, []);

  return null;
}
