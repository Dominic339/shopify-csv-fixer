// src/app/merge/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import MergeClient from "./MergeClient";
import { getTranslations } from "@/lib/i18n/getTranslations";
import { isValidLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";

export const metadata: Metadata = {
  title: "CSV Merger & Deduplicator",
  description:
    "Merge two CSV files and remove duplicates. Choose append or dedupe mode, pick your dedupe key, and resolve conflicts. Free for small files.",
  alternates: { canonical: "/merge" },
  openGraph: {
    title: "CSV Merger & Deduplicator | StriveFormats",
    description:
      "Combine two CSV files with optional deduplication. Choose a dedupe key and conflict resolution strategy.",
    url: "https://striveformats.com/merge",
  },
};

export default async function MergePage() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = localeCookie && isValidLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const t = await getTranslations(locale);

  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-10">Loading…</div>}>
      <MergeClient t={t.merge} />
    </Suspense>
  );
}
