// Localized /amazon-csv-fixer, e.g. /de/amazon-csv-fixer (shared body: src/views/platformLanding.tsx)
import { notFound } from "next/navigation";

import { PlatformLandingView, platformLandingMetadata } from "@/views/platformLanding";
import { localeParams, resolveLocale, type LocaleParams } from "@/views/localeRoute";

export const generateStaticParams = localeParams;

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  return locale ? platformLandingMetadata("amazon", locale) : {};
}

export default async function LocalizedLandingPage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  if (!locale) notFound();
  return <PlatformLandingView slug="amazon" locale={locale} />;
}
