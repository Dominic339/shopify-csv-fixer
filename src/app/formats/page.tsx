import type { Metadata } from "next";
import FormatsClient from "@/lib/formats/FormatsClient";
import { sectionByLocale } from "@/lib/i18n/getTranslations";

export const metadata: Metadata = {
  title: "Custom Formats | StriveFormats",
  description:
    "Create reusable CSV formats from a sample file: columns, required fields, allowed values and cleanup rules, checked automatically in the CSV Fixer.",
  alternates: { canonical: "/formats" },
  robots: { index: true, follow: true },
};

export default async function FormatsPage() {
  const formatsByLocale = await sectionByLocale("formats");
  return <FormatsClient formatsByLocale={formatsByLocale} />;
}
