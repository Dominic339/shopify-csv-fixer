// Unit tests for locale path helpers, SEO alternates and translation fallback.
import { describe, it, expect } from "vitest";
import { pathInLocale, splitLocale, isLocalisedPath } from "@/lib/i18n/paths";
import { pageAlternates } from "@/lib/i18n/seo";
import { fmt, getTranslations } from "@/lib/i18n/getTranslations";
import { LOCALES } from "@/lib/i18n/locales";
import en from "@/i18n/en.json";

describe("locale paths", () => {
  it("splits locale prefixes", () => {
    expect(splitLocale("/de/app")).toEqual({ locale: "de", path: "/app" });
    expect(splitLocale("/de")).toEqual({ locale: "de", path: "/" });
    expect(splitLocale("/app")).toEqual({ locale: "en", path: "/app" });
  });

  it("maps the same page to another language, or that language's home", () => {
    expect(pathInLocale("/de/guides/shopify", "fr")).toBe("/fr/guides/shopify");
    expect(pathInLocale("/es/presets", "en")).toBe("/presets");
    expect(pathInLocale("/about", "ja")).toBe("/ja");
    expect(isLocalisedPath("/about")).toBe(false);
  });
});

describe("pageAlternates", () => {
  it("lists every language for translated pages", () => {
    const alt = pageAlternates("de", "/convert");
    expect(alt?.canonical).toBe("/de/convert");
    expect(Object.keys(alt?.languages ?? {})).toHaveLength(LOCALES.length + 1);
  });

  it("points localized copies of English-only content at the English page", () => {
    expect(pageAlternates("de", "/guides/shopify/x", false)).toEqual({ canonical: "/guides/shopify/x" });
  });
});

describe("translations", () => {
  it("every locale has every key (missing ones fall back to English)", async () => {
    const keys = (o: object, p = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
    const expected = keys(en).sort();
    for (const l of LOCALES) expect(keys(await getTranslations(l)).sort(), l).toEqual(expect.arrayContaining(expected));
  });

  it("each locale file translates every English string and keeps its {placeholders}", async () => {
    const flat = (o: object, p = ""): [string, string][] =>
      Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, `${p}${k}.`) : [[`${p}${k}`, String(v)] as [string, string]]));
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const l of LOCALES) {
      const raw = Object.fromEntries(flat((await import(`@/i18n/${l}.json`)).default));
      for (const [key, english] of flat(en)) {
        expect(raw[key], `${l}: ${key} is missing`).toBeDefined();
        expect(placeholders(raw[key]), `${l}: ${key}`).toEqual(placeholders(english));
      }
    }
  });

  it("fills placeholders", () => {
    expect(fmt("Why {platform} rejects this", { platform: "eBay" })).toBe("Why eBay rejects this");
    expect(fmt("{a} {missing}", { a: 1 })).toBe("1 {missing}");
  });
});
