// Localized /guides (shared body: src/views/guidePages.tsx)
import { notFound } from "next/navigation";

import { GuidesHubView, guidesHubMetadata } from "@/views/guidePages";
import { localeParams, resolveLocale } from "@/views/localeRoute";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> };

export const generateStaticParams = localeParams;

export async function generateMetadata({ params }: Props) {
  const locale = await resolveLocale(params);
  return locale ? guidesHubMetadata(locale) : {};
}

export default async function LocalizedGuidesHubPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  if (!locale) notFound();
  const { q } = await searchParams;
  return <GuidesHubView locale={locale} q={q} />;
}
