// Localized /profile, e.g. /de/profile (shared body: src/views/toolPages.tsx)
import { notFound } from "next/navigation";

import { ToolView, toolMetadata } from "@/views/toolPages";
import { localeParams, resolveLocale, type LocaleParams } from "@/views/localeRoute";

export const generateStaticParams = localeParams;

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  return locale ? toolMetadata(locale, "profile") : {};
}

export default async function LocalizedProfilePage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  if (!locale) notFound();
  return <ToolView locale={locale} tool="profile" />;
}
