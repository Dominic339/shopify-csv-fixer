// Localized /guides/<platform>/<slug> (shared body: src/views/guidePages.tsx)
import { notFound } from "next/navigation";

import { allGuideParams, GuideView, guideMetadata } from "@/views/guidePages";
import { localeParams, resolveLocale } from "@/views/localeRoute";

type Props = { params: Promise<{ locale: string; platform: string; slug: string }> };

export function generateStaticParams() {
  return localeParams().flatMap(({ locale }) => allGuideParams().map((g) => ({ locale, ...g })));
}

export async function generateMetadata({ params }: Props) {
  const locale = await resolveLocale(params);
  if (!locale) return {};
  const { platform, slug } = await params;
  return guideMetadata(locale, platform, slug);
}

export default async function LocalizedGuideDetailPage({ params }: Props) {
  const locale = await resolveLocale(params);
  if (!locale) notFound();
  const { platform, slug } = await params;
  return <GuideView locale={locale} platform={platform} slug={slug} />;
}
