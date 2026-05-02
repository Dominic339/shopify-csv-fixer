// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import TopBar from "@/components/TopBar";
import Footer from "@/components/Footer";

import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

import GoogleAnalytics from "@/components/GoogleAnalytics";
import { getTranslations } from "@/lib/i18n/getTranslations";
import { isValidLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";

export const metadata: Metadata = {
  metadataBase: new URL("https://striveformats.com"),
  title: {
    default: "StriveFormats | Clean. Standardize. Validate.",
    template: "%s | StriveFormats",
  },
  description:
    "Fix and convert messy CSV files for Shopify and other tools. Upload, auto-fix safe issues, and export clean files in seconds.",
  applicationName: "StriveFormats",

  // ✅ ADD THIS SECTION
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: ["/apple-icon.png"],
  },

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = localeCookie && isValidLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const t = await getTranslations(locale);

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <TopBar navT={t.nav} />
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
