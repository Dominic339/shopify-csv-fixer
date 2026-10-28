// Localized /convert, e.g. /de/convert (shared body: src/views/toolPages.tsx)
import { notFound } from "next/navigation";

import { ToolView, toolMetadata } from "@/views/toolPages";
import { localeParams, resolveLocale, type LocaleParams } from "@/views/localeRoute";

export const generateStaticParams = localeParams;

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  return locale ? toolMetadata(locale, "convert") : {};
}

export default async function LocalizedConvertPage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  if (!locale) notFound();
  return <ToolView locale={locale} tool="convert" />;
}
