// Localized /presets/<id> (shared body: src/views/presetPages.tsx)
import { notFound } from "next/navigation";

import { getPresetFormats } from "@/lib/presets";
import { PresetDetailView, presetDetailMetadata } from "@/views/presetPages";
import { localeParams, resolveLocale } from "@/views/localeRoute";

type Props = { params: Promise<{ locale: string; id: string }> };

export function generateStaticParams() {
  return localeParams().flatMap(({ locale }) => getPresetFormats().map((p) => ({ locale, id: p.id })));
}

export async function generateMetadata({ params }: Props) {
  const locale = await resolveLocale(params);
  return locale ? presetDetailMetadata(locale, (await params).id) : {};
}

export default async function LocalizedPresetDetailPage({ params }: Props) {
  const locale = await resolveLocale(params);
  if (!locale) notFound();
  return <PresetDetailView locale={locale} rawId={(await params).id} />;
}
