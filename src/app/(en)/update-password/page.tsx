import { Suspense } from "react";
import type { Metadata } from "next";
import UpdatePasswordClient from "./UpdatePasswordClient";
import { sectionByLocale } from "@/lib/i18n/getTranslations";

export const metadata: Metadata = {
  title: "Update Password",
  description: "Set a new password for your StriveFormats account.",
};

export default async function UpdatePasswordPage() {
  const authByLocale = await sectionByLocale("auth");
  return (
    <Suspense>
      <UpdatePasswordClient authByLocale={authByLocale} />
    </Suspense>
  );
}
