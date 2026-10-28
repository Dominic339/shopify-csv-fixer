// Localized /privacy (shared body: src/views/infoPages.tsx)
import { notFound } from "next/navigation";

import { infoPageMetadata, PolicyView } from "@/views/infoPages";
import { localeParams, resolveLocale, type LocaleParams } from "@/views/localeRoute";

export const generateStaticParams = localeParams;

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  return locale ? infoPageMetadata("privacy", locale) : {};
}

export default async function LocalizedPrivacyPage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  if (!locale) notFound();
  return <PolicyView page="privacy" locale={locale} />;
}
