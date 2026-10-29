// Localized /how-it-works (shared body: src/views/howItWorks.tsx)
import { notFound } from "next/navigation";

import { HowItWorksView, howItWorksMetadata } from "@/views/howItWorks";
import { localeParams, resolveLocale, type LocaleParams } from "@/views/localeRoute";

export const generateStaticParams = localeParams;

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  return locale ? howItWorksMetadata(locale) : {};
}

export default async function LocalizedHowItWorksPage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  if (!locale) notFound();
  return <HowItWorksView locale={locale} />;
}
