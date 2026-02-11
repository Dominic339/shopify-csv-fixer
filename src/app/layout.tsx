// src/app/layout.tsx
import "./globals.css";
import TopBar from "@/components/TopBar";
import Footer from "@/components/Footer";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://csnest.vercel.app"),
  title: {
    default: "CSNest | CSV Fixer for Shopify",
    template: "%s | CSNest",
  },
  description:
    "Fix and convert messy CSV files for Shopify and other tools. Upload, auto-fix safe issues, and export clean files in seconds.",
  keywords: ["Shopify CSV", "CSV fixer", "CSV cleanup", "Shopify import", "CSV validator"],
  applicationName: "CSNest",
  openGraph: {
    title: "CSNest | CSV Fixer for Shopify",
    description:
      "Fix and convert messy CSV files for Shopify and other tools. Upload, auto-fix safe issues, and export clean files in seconds.",
    url: "https://csnest.vercel.app",
    siteName: "CSNest",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "CSNest",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CSNest | CSV Fixer for Shopify",
    description:
      "Fix and convert messy CSV files for Shopify and other tools. Upload, auto-fix safe issues, and export clean files in seconds.",
    images: ["/opengraph-image"],
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "CSNest",
      url: "https://csnest.vercel.app",
      logo: "https://csnest.vercel.app/CSV%20Nest%20Logo.png",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "CSNest",
      url: "https://csnest.vercel.app",
    },
  ];

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <TopBar />
        {children}
        <Footer />
        <Analytics />
        <SpeedInsights />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
