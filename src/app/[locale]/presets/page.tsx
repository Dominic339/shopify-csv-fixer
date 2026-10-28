// Localized /presets (shared body: src/views/presetPages.tsx)
import { notFound } from "next/navigation";

import { PresetsView, presetsMetadata } from "@/views/presetPages";
import { localeParams, resolveLocale, type LocaleParams } from "@/views/localeRoute";

export const generateStaticParams = localeParams;

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  return locale ? presetsMetadata(locale) : {};
}

export default async function LocalizedPresetsPage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  if (!locale) notFound();
  return <PresetsView locale={locale} />;
}
