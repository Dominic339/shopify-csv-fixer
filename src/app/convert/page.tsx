// src/app/convert/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import ConvertClient from "./ConvertClient";

export const metadata: Metadata = {
  title: "CSV Format Converter",
  description:
    "Convert CSV files between Shopify, WooCommerce, Etsy, eBay, and Amazon formats. Upload your file, choose source and target format, and download a converted CSV in seconds.",
  alternates: { canonical: "/convert" },
  openGraph: {
    title: "CSV Format Converter | StriveFormats",
    description:
      "Convert ecommerce CSV files between Shopify, WooCommerce, Etsy, eBay, and Amazon formats.",
    url: "https://striveformats.com/convert",
  },
};

export default function ConvertPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-10">Loading…</div>}>
      <ConvertClient />
    </Suspense>
  );
}
