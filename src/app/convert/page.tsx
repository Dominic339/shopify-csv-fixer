// src/app/convert/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import ConvertClient from "./ConvertClient";
import { getTranslations } from "@/lib/i18n/getTranslations";
import { isValidLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";

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

export default async function ConvertPage() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = localeCookie && isValidLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const t = await getTranslations(locale);

  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-10">Loading…</div>}>
      <ConvertClient t={t.convert} />
    </Suspense>
  );
}
