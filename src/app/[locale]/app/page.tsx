// Localized /app, e.g. /de/app (shared body: src/views/toolPages.tsx)
import { notFound } from "next/navigation";

import { ToolView, toolMetadata } from "@/views/toolPages";
import { localeParams, resolveLocale, type LocaleParams } from "@/views/localeRoute";

export const generateStaticParams = localeParams;

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  return locale ? toolMetadata(locale, "app") : {};
}

export default async function LocalizedAppPage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  if (!locale) notFound();
  return <ToolView locale={locale} tool="app" />;
}
