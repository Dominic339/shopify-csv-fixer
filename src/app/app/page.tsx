// src/app/app/page.tsx
import { Suspense } from "react";
import { cookies } from "next/headers";
import AppClient from "./AppClient";
import { getTranslations } from "@/lib/i18n/getTranslations";
import { isValidLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";

export default async function Page() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = localeCookie && isValidLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const t = await getTranslations(locale);

  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-6 py-10">Loading…</div>}>
      <AppClient tApp={t.app} />
    </Suspense>
  );
}
