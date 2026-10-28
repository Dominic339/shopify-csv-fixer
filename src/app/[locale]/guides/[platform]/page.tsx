// Localized /guides/<platform> (shared body: src/views/guidePages.tsx)
import { notFound } from "next/navigation";

import { GUIDE_PLATFORMS } from "@/lib/guidesRegistry";
import { GuidesPlatformView, guidesPlatformMetadata } from "@/views/guidePages";
import { localeParams, resolveLocale } from "@/views/localeRoute";

type Props = { params: Promise<{ locale: string; platform: string }> };

export function generateStaticParams() {
  return localeParams().flatMap(({ locale }) => GUIDE_PLATFORMS.map((platform) => ({ locale, platform })));
}

export async function generateMetadata({ params }: Props) {
  const locale = await resolveLocale(params);
  return locale ? guidesPlatformMetadata(locale, (await params).platform) : {};
}

export default async function LocalizedPlatformGuidesPage({ params }: Props) {
  const locale = await resolveLocale(params);
  if (!locale) notFound();
  return <GuidesPlatformView locale={locale} platform={(await params).platform} />;
}
