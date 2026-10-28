import { Suspense } from "react";
import type { Metadata } from "next";
import ResetPasswordClient from "./ResetPasswordClient";
import { sectionByLocale } from "@/lib/i18n/getTranslations";

export const metadata: Metadata = {
  title: "Reset Password | StriveFormats",
  description: "Reset your StriveFormats account password.",
};

export default async function ResetPasswordPage() {
  const authByLocale = await sectionByLocale("auth");
  return (
    <Suspense>
      <ResetPasswordClient authByLocale={authByLocale} />
    </Suspense>
  );
}
