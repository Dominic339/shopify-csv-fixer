// src/app/merge/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import MergeClient from "./MergeClient";

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

export default function MergePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-10">Loading…</div>}>
      <MergeClient />
    </Suspense>
  );
}
