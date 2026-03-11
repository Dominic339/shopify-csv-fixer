// src/app/[locale]/profile/page.tsx
// Locale-prefixed Profile page (e.g. /es/profile, /de/profile).

import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import ProfileClient from "@/app/profile/ProfileClient";
import { getTranslations } from "@/lib/i18n/getTranslations";
import { isValidLocale, DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/locales";

type Props = { params: Promise<{ locale: string }> };

export async function generateStaticParams() {
  return LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

export default async function LocaleProfilePage({ params }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale) || locale === DEFAULT_LOCALE) notFound();

  const t = await getTranslations(locale as Locale);

  return (
    <Suspense fallback={null}>
      <ProfileClient tProfile={t.profile} navT={t.nav} />
    </Suspense>
  );
}
