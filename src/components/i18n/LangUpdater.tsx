"use client";

// Lightweight client component that updates the html[lang] attribute.
// The root layout sets lang="en"; this corrects it for localized routes.

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n/locales";

export default function LangUpdater({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    return () => {
      document.documentElement.lang = "en";
    };
  }, [locale]);

  return null;
}
