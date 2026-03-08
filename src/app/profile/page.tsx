// src/app/profile/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import ProfileClient from "./ProfileClient";
import { getTranslations } from "@/lib/i18n/getTranslations";
import { isValidLocale, DEFAULT_LOCALE } from "@/lib/i18n/locales";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = localeCookie && isValidLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const t = await getTranslations(locale);

  return (
    <Suspense fallback={null}>
      <ProfileClient tProfile={t.profile} navT={t.nav} />
    </Suspense>
  );
}
