// Localized /guides layout (shared shell: src/views/guidePages.tsx)
import { notFound } from "next/navigation";

import { GuidesShell } from "@/views/guidePages";
import { resolveLocale } from "@/views/localeRoute";

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export default async function LocalizedGuidesLayout({ children, params }: Props) {
  const locale = await resolveLocale(params);
  if (!locale) notFound();
  return <GuidesShell locale={locale}>{children}</GuidesShell>;
}
