"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n/locales";
import { ENGLISH_VALIDATION_TEXT, loadValidationDicts, validationText, type ValidationDicts, type ValidationText } from "@/lib/i18n/validationText";

/** Validator messages and issue text in the page's language (English until loaded). */
export function useValidationText(locale: Locale): ValidationText {
  const [dicts, setDicts] = useState<{ locale: Locale; d: ValidationDicts } | null>(null);

  useEffect(() => {
    if (locale === "en") return;
    let cancelled = false;
    loadValidationDicts(locale)
      .then((d) => !cancelled && setDicts({ locale, d }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return useMemo(() => (dicts && dicts.locale === locale ? validationText(dicts.d) : ENGLISH_VALIDATION_TEXT), [dicts, locale]);
}
