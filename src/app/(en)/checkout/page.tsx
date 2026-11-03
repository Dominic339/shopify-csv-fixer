// src/app/checkout/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";
import { sectionByLocale } from "@/lib/i18n/getTranslations";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const authByLocale = await sectionByLocale("auth");
  return (
    <Suspense fallback={null}>
      <CheckoutClient authByLocale={authByLocale} />
    </Suspense>
  );
}
