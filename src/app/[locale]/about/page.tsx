// Localized /about (shared body: src/views/infoPages.tsx)
import { notFound } from "next/navigation";

import { AboutView, infoPageMetadata } from "@/views/infoPages";
import { localeParams, resolveLocale, type LocaleParams } from "@/views/localeRoute";

export const generateStaticParams = localeParams;

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  return locale ? infoPageMetadata("about", locale) : {};
}

export default async function LocalizedAboutPage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  if (!locale) notFound();
  return <AboutView locale={locale} />;
}
