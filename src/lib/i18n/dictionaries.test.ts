// Every language must translate every validator message, issue rule, guide card and preset
// write-up. A missing entry would quietly show English on that page.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import templates from "@/i18n/messages/templates.json";
import { LOCALES } from "@/lib/i18n/locales";
import { SHOPIFY_ISSUE_META } from "@/lib/validation/issueMetaShopify";
import { WOOCOMMERCE_ISSUE_META } from "@/lib/validation/issueMetaWooCommerce";
import { ETSY_ISSUE_META } from "@/lib/validation/issueMetaEtsy";
import { EBAY_ISSUE_META } from "@/lib/validation/issueMetaEbay";
import { AMAZON_ISSUE_META } from "@/lib/validation/issueMetaAmazon";
import { listCuratedGuides } from "@/lib/guides/mdxLoader";
import { getAllFormats } from "@/lib/formats";

const root = process.cwd();
const read = (dir: string, loc: string) => JSON.parse(fs.readFileSync(path.join(root, "src/i18n", dir, `${loc}.json`), "utf8"));
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

const issueCodes = [SHOPIFY_ISSUE_META, WOOCOMMERCE_ISSUE_META, ETSY_ISSUE_META, EBAY_ISSUE_META, AMAZON_ISSUE_META].flatMap((m) => Object.keys(m));
const guideKeys = listCuratedGuides().map((g) => `${g.platform}/${g.slug}`);
const presets = getAllFormats().filter((f) => f.source === "builtin" && f.seo);

describe.each(LOCALES.filter((l) => l !== "en"))("%s dictionaries", (loc) => {
  it("translate every message template with the same placeholders", () => {
    const dict: Record<string, string> = read("messages", loc);
    const missing = (templates as string[]).filter((t) => !dict[t]);
    const badPlaceholders = (templates as string[]).filter((t) => dict[t] && placeholders(dict[t]).join() !== placeholders(t).join());
    expect({ missing, badPlaceholders }).toEqual({ missing: [], badPlaceholders: [] });
  });

  it("translate every issue rule", () => {
    const dict: Record<string, Record<string, string>> = read("issues", loc);
    const missing = issueCodes.filter((c) => ["title", "explanation", "whyPlatformCares", "howToFix"].some((f) => !dict[c]?.[f]));
    expect(missing).toEqual([]);
  });

  it("translate every guide card and preset write-up", () => {
    const { guides, presets: seo } = read("content", loc);
    expect(guideKeys.filter((k) => !guides[k]?.title || !guides[k]?.description)).toEqual([]);
    for (const f of presets) {
      const t = seo[f.id];
      expect(t, f.id).toBeTruthy();
      for (const field of ["longDescription", "howItWorks", "commonFixes", "faq"] as const) {
        expect(t[field]?.length, `${f.id}.${field}`).toBe(f.seo![field]?.length ?? 0);
      }
    }
  });
});
