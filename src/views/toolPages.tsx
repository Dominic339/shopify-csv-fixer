// src/views/toolPages.tsx
// Shared page bodies + metadata for the home page and the tool pages. Each exists at
// /<path> (English) and /<locale>/<path>; both routes render these with their locale.

import { Suspense } from "react";
import type { Metadata } from "next";

import HomeClient from "@/app/HomeClient";
import AppClient from "@/app/app/AppClient";
import ConvertClient from "@/app/convert/ConvertClient";
import MergeClient from "@/app/merge/MergeClient";
import InspectorClient from "@/app/csv-inspector/InspectorClient";
import ProfileClient from "@/app/profile/ProfileClient";
import { getTranslations } from "@/lib/i18n/getTranslations";
import { localeHref, type Locale } from "@/lib/i18n/locales";
import { pageAlternates, SITE_URL } from "@/lib/i18n/seo";

export type ToolId = "home" | "app" | "convert" | "merge" | "inspector" | "profile";

const PATHS: Record<ToolId, string> = {
  home: "/",
  app: "/app",
  convert: "/convert",
  merge: "/merge",
  inspector: "/csv-inspector",
  profile: "/profile",
};

export async function toolMetadata(locale: Locale, tool: ToolId): Promise<Metadata> {
  const t = await getTranslations(locale);
  const path = PATHS[tool];
  const { title, description } = {
    home: { title: t.home.title, description: t.home.description },
    app: { title: t.app.title, description: t.app.subtitle },
    convert: { title: t.convert.title, description: t.convert.description },
    merge: { title: t.merge.title, description: t.merge.description },
    inspector: { title: t.inspector.title, description: t.inspector.description },
    profile: { title: t.nav.profile, description: "" },
  }[tool];

  if (tool === "profile") return { title, robots: { index: false, follow: false } };

  const url = `${SITE_URL}${localeHref(locale, path)}`;
  return {
    // The home title is complete on its own; other titles get the " | StriveFormats" template.
    title: tool === "home" ? { absolute: title } : title,
    description,
    alternates: pageAlternates(locale, path),
    openGraph: { title, description, url, locale },
  };
}

const narrow = <div className="mx-auto max-w-3xl px-6 py-10" />;

export async function ToolView({ locale, tool }: { locale: Locale; tool: ToolId }) {
  const t = await getTranslations(locale);
  switch (tool) {
    case "home":
      return <HomeClient tHome={t.home} tPricing={t.pricing} />;
    case "app":
      return (
        <Suspense fallback={<div className="mx-auto max-w-6xl px-6 py-10" />}>
          <AppClient tApp={t.app} />
        </Suspense>
      );
    case "convert":
      return (
        <Suspense fallback={narrow}>
          <ConvertClient t={t.convert} />
        </Suspense>
      );
    case "merge":
      return (
        <Suspense fallback={narrow}>
          <MergeClient t={t.merge} />
        </Suspense>
      );
    case "inspector":
      return (
        <Suspense fallback={narrow}>
          <InspectorClient t={t.inspector} />
        </Suspense>
      );
    case "profile":
      return (
        <Suspense fallback={null}>
          <ProfileClient tProfile={t.profile} navT={t.nav} />
        </Suspense>
      );
  }
}
