// Localized /tools (shared body: src/views/smallToolPages.tsx)
import { notFound } from "next/navigation";

import { SmallToolsIndexView, smallToolsIndexMetadata } from "@/views/smallToolPages";
import { localeParams, resolveLocale, type LocaleParams } from "@/views/localeRoute";

export const generateStaticParams = localeParams;

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  return locale ? smallToolsIndexMetadata(locale) : {};
}

export default async function LocalizedToolsPage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  if (!locale) notFound();
  return <SmallToolsIndexView locale={locale} />;
}
