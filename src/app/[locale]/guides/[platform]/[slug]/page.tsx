// Localized /guides/<platform>/<slug> (shared body: src/views/guidePages.tsx)
import { notFound } from "next/navigation";

import { allGuideParams, GuideView, guideMetadata } from "@/views/guidePages";
import { localeParams, resolveLocale } from "@/views/localeRoute";
import { ENGLISH_ONLY_GUIDE_PLATFORMS, type GuidePlatform } from "@/lib/guidesConstants";

type Props = { params: Promise<{ locale: string; platform: string; slug: string }> };

export function generateStaticParams() {
  return localeParams().flatMap(({ locale }) => allGuideParams()
      .filter((g) => !ENGLISH_ONLY_GUIDE_PLATFORMS.includes(g.platform as GuidePlatform))
      .map((g) => ({ locale, ...g })),
  );
}

export async function generateMetadata({ params }: Props) {
  const locale = await resolveLocale(params);
  if (!locale) return {};
  const { platform, slug } = await params;
  return guideMetadata(locale, platform, slug);
}

export default async function LocalizedGuideDetailPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const { platform, slug } = await params;
  if (!locale || ENGLISH_ONLY_GUIDE_PLATFORMS.includes(platform as GuidePlatform)) notFound();
  return <GuideView locale={locale} platform={platform} slug={slug} />;
}
