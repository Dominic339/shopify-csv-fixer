"use client";
// For English-only routes (login, checkout, …): show the visitor's chosen language.
// The server renders English; the client switches after hydration.

import { useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, isValidLocale, type Locale } from "@/lib/i18n/locales";
import { LOCALE_COOKIE } from "@/lib/i18n/paths";

function readCookieLocale(): Locale {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`));
  const value = match?.[1] ?? "";
  return isValidLocale(value) ? value : DEFAULT_LOCALE;
}

const noopSubscribe = () => () => {};

export function useCookieLocale(): Locale {
  return useSyncExternalStore(noopSubscribe, readCookieLocale, () => DEFAULT_LOCALE);
}

