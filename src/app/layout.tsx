// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Analytics from "@/components/Analytics";

export const metadata: Metadata = {
  metadataBase: new URL("https://csv-nest.vercel.app"), // keep vercel URL for now
  title: {
    default: "CSV Nest – Fix Broken CSV Files Online",
    template: "%s | CSV Nest",
  },
  description:
    "Fix broken CSV files instantly. Clean, validate, normalize, merge, and export CSV files directly in your browser. Includes Shopify and eCommerce presets.",
  keywords: [
    "fix csv file",
    "clean csv online",
    "csv validator",
    "merge csv files",
    "shopify csv fixer",
    "bulk csv parser",
    "csv formatting tool",
  ],
  openGraph: {
    title: "CSV Nest – Fix Broken CSV Files Online",
    description:
      "Clean and repair CSV files instantly. Merge, normalize, and export clean data in seconds.",
    url: "https://csv-nest.vercel.app",
    siteName: "CSV Nest",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CSV Nest – Fix Broken CSV Files",
    description: "Fix broken CSV files online. Merge and clean data instantly.",
  },
  alternates: {
    canonical: "https://csv-nest.vercel.app",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Analytics />
        {children}
      </body>
    </html>
  );
}
