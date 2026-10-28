// Localized /merge, e.g. /de/merge (shared body: src/views/toolPages.tsx)
import { notFound } from "next/navigation";

import { ToolView, toolMetadata } from "@/views/toolPages";
import { localeParams, resolveLocale, type LocaleParams } from "@/views/localeRoute";

export const generateStaticParams = localeParams;

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  return locale ? toolMetadata(locale, "merge") : {};
}

export default async function LocalizedMergePage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  if (!locale) notFound();
  return <ToolView locale={locale} tool="merge" />;
}
