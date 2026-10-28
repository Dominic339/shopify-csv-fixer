import type { Metadata } from "next";
import { Suspense } from "react";
import LoginClient from "./LoginClient";
import { sectionByLocale } from "@/lib/i18n/getTranslations";

export const metadata: Metadata = {
  title: "Login",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const authByLocale = await sectionByLocale("auth");
  return (
    <Suspense fallback={null}>
      <LoginClient authByLocale={authByLocale} />
    </Suspense>
  );
}
