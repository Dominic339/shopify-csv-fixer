// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import TopBar from "@/components/TopBar";
import Footer from "@/components/Footer";

import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

import GoogleAnalytics from "@/components/GoogleAnalytics";

export const metadata: Metadata = {
  metadataBase: new URL("https://striveformats.com"),
  title: {
    default: "StriveFormats | Clean. Standardize. Validate.",
    template: "%s | StriveFormats",
  },
  description:
    "Fix and convert messy CSV files for Shopify and other tools. Upload, auto-fix safe issues, and export clean files in seconds.",
  applicationName: "StriveFormats",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://striveformats.com",
    title: "StriveFormats | Clean. Standardize. Validate.",
    description:
      "Fix and convert messy CSV files for Shopify and other tools. Upload, auto-fix safe issues, and export clean files in seconds.",
    siteName: "StriveFormats",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "StriveFormats" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "StriveFormats | Clean. Standardize. Validate.",
    description:
      "Fix and convert messy CSV files for Shopify and other tools. Upload, auto-fix safe issues, and export clean files in seconds.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
  keywords: [
    "fix csv file",
    "clean csv online",
    "csv validator",
    "merge csv files",
    "shopify csv fixer",
    "bulk csv parser",
    "csv formatting tool",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <TopBar />
          {children}
          <Footer />
        </ThemeProvider>

        <GoogleAnalytics />
        <VercelAnalytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
