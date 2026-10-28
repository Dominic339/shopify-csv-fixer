"use client";
// For English-only routes (login, checkout, …): show the visitor's chosen language,
// or their device's language if they haven't chosen one. The server renders English;
// the client switches after hydration.

import { useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, isValidLocale, pickLocale, type Locale } from "@/lib/i18n/locales";
import { LOCALE_COOKIE } from "@/lib/i18n/paths";

function readCookieLocale(): Locale {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`));
  const value = match?.[1] ?? "";
  if (isValidLocale(value)) return value;
  return pickLocale(navigator.languages?.length ? navigator.languages : [navigator.language]) ?? DEFAULT_LOCALE;
}

const noopSubscribe = () => () => {};

export function useCookieLocale(): Locale {
  return useSyncExternalStore(noopSubscribe, readCookieLocale, () => DEFAULT_LOCALE);
}

