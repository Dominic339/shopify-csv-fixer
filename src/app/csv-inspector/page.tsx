// src/app/csv-inspector/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import InspectorClient from "./InspectorClient";
import { getTranslations } from "@/lib/i18n/getTranslations";
import { isValidLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";

export const metadata: Metadata = {
  title: "Free CSV Inspector",
  description:
    "Free CSV inspection tool. Instantly check row count, column count, duplicate headers, blank rows, empty columns, inconsistent column counts, and encoding issues — no sign-up required.",
  alternates: { canonical: "/csv-inspector" },
  openGraph: {
    title: "Free CSV Inspector | StriveFormats",
    description:
      "Upload any CSV and get an instant analysis: row count, headers, blank rows, duplicates, encoding hints, and more.",
    url: "https://striveformats.com/csv-inspector",
  },
  robots: { index: true, follow: true },
};

export default async function CsvInspectorPage() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = localeCookie && isValidLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const t = await getTranslations(locale);

  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-10">Loading…</div>}>
      <InspectorClient t={t.inspector} />
    </Suspense>
  );
}
