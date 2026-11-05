// Localized /guides/<platform> (shared body: src/views/guidePages.tsx)
import { notFound } from "next/navigation";

import { GUIDE_PLATFORMS } from "@/lib/guidesRegistry";
import { ENGLISH_ONLY_GUIDE_PLATFORMS, type GuidePlatform } from "@/lib/guidesConstants";
import { GuidesPlatformView, guidesPlatformMetadata } from "@/views/guidePages";
import { localeParams, resolveLocale } from "@/views/localeRoute";

type Props = { params: Promise<{ locale: string; platform: string }> };

export function generateStaticParams() {
  return localeParams().flatMap(({ locale }) => GUIDE_PLATFORMS.filter((p) => !ENGLISH_ONLY_GUIDE_PLATFORMS.includes(p)).map((platform) => ({ locale, platform })));
}

export async function generateMetadata({ params }: Props) {
  const locale = await resolveLocale(params);
  return locale ? guidesPlatformMetadata(locale, (await params).platform) : {};
}

export default async function LocalizedPlatformGuidesPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const { platform } = await params;
  // English-only guide platforms have no translated copy (links go to the English page).
  if (!locale || ENGLISH_ONLY_GUIDE_PLATFORMS.includes(platform as GuidePlatform)) notFound();
  return <GuidesPlatformView locale={locale} platform={(await params).platform} />;
}
