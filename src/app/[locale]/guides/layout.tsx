// src/app/[locale]/guides/layout.tsx
// Wraps all locale guide pages (hub, platform list, individual guides)
// with the same sidebar layout used by the English /guides/ routes.

import { Suspense } from "react";
import GuideSidebar from "@/components/GuideSidebar";
import { isValidLocale } from "@/lib/i18n/locales";
import type { Locale } from "@/lib/i18n/locales";
import { getTranslations } from "@/lib/i18n/getTranslations";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleGuidesLayout({ children, params }: Props) {
  const { locale } = await params;
  const t = isValidLocale(locale) ? await getTranslations(locale as Locale) : null;

  return (
    <div className="mx-auto flex max-w-6xl gap-10 px-6 py-14">
      <Suspense fallback={<div className="w-52 shrink-0" />}>
        <GuideSidebar
          searchPlaceholder={t?.guides.searchPlaceholder}
          allGuides={t?.guides.allGuides}
          platformsLabel={t?.guides.platformsLabel}
        />
      </Suspense>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
