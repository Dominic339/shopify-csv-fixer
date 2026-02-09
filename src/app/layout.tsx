// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import TopBar from "@/components/TopBar";

export const metadata: Metadata = {
  title: {
    default: "CSNest CSV Fixer | Fix Shopify CSV Import Errors",
    template: "%s | CSNest CSV Fixer",
  },
  description:
    "CSNest CSV Fixer helps Shopify store owners fix CSV import errors instantly. Clean headers, normalize data, and export Shopify-ready CSV files.",
  keywords: [
    "Shopify CSV fixer",
    "CSV import errors",
    "Shopify CSV tool",
    "CSV cleanup",
    "Shopify product import",
    "Shopify tools",
  ],
  openGraph: {
    title: "CSNest CSV Fixer",
    description:
      "Upload a CSV, auto-fix safe issues, manually edit the rest, and export a Shopify-ready file.",
    url: "https://csnest.vercel.app",
    siteName: "CSNest",
    images: [
      {
        url: "https://csnest.vercel.app/og.png",
        width: 1200,
        height: 630,
        alt: "CSNest CSV Fixer preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <TopBar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
