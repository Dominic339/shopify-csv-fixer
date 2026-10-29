// Localized /tools/<slug> (shared body: src/views/smallToolPages.tsx)
import { notFound } from "next/navigation";

import { SMALL_TOOLS, smallToolBySlug } from "@/lib/tools/registry";
import { SmallToolView, smallToolMetadata } from "@/views/smallToolPages";
import { localeParams, resolveLocale } from "@/views/localeRoute";

type Params = { params: Promise<{ locale: string; tool: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return localeParams().flatMap(({ locale }) => SMALL_TOOLS.map(({ slug }) => ({ locale, tool: slug })));
}

export async function generateMetadata({ params }: Params) {
  const locale = await resolveLocale(params);
  const { tool } = await params;
  return locale ? smallToolMetadata(locale, tool) : {};
}

export default async function LocalizedSmallToolPage({ params }: Params) {
  const locale = await resolveLocale(params);
  const { tool } = await params;
  if (!locale || !smallToolBySlug(tool)) notFound();
  return <SmallToolView locale={locale} slug={tool} />;
}
