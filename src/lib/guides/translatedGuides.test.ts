// Translated guide articles (src/content/guides-i18n/<locale>/<platform>/<slug>.mdx) must keep
// the English article's shape, so no section, table or example goes missing in translation.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/lib/i18n/locales";

const root = path.join(process.cwd(), "src", "content");
const read = (file: string) => matter(fs.readFileSync(file, "utf8"));

/** Counts that should not change in translation. */
function shape(mdx: string) {
  const lines = mdx.split("\n");
  return {
    h2: lines.filter((l) => /^##\s/.test(l)).length,
    h3: lines.filter((l) => /^###\s/.test(l)).length,
    fences: lines.filter((l) => l.startsWith("```")).length,
    tableRows: lines.filter((l) => l.startsWith("|")).length,
    links: (mdx.match(/\]\(/g) ?? []).length,
  };
}

/** Closing "**" that sit between punctuation and a letter (e.g. "（…）**を" or "(…)**을"), so Markdown won't close the bold. */
function badBoldClosers(mdx: string): string[] {
  const bad: string[] = [];
  for (const line of mdx.split("\n")) {
    if (line.startsWith("```") || line.startsWith("|")) continue;
    [...line.matchAll(/\*\*/g)].forEach((m, i) => {
      if (i % 2 === 0) return; // an opener
      const before = line[m.index - 1] ?? "";
      const after = line[m.index + 2] ?? "";
      if (/\p{P}/u.test(before) && after && !/[\s\p{P}\p{S}]/u.test(after)) bad.push(line);
    });
  }
  return bad;
}

const translated = LOCALES.filter((l) => l !== "en").flatMap((loc) => {
  const dir = path.join(root, "guides-i18n", loc);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).flatMap((platform) =>
    fs.readdirSync(path.join(dir, platform)).map((f) => ({ loc, platform, slug: f.replace(/\.mdx$/, ""), file: path.join(dir, platform, f) })),
  );
});

describe("translated guide articles", () => {
  it.each(translated.map((t) => [`${t.loc}/${t.platform}/${t.slug}`, t] as const))("%s matches the English article", (_, t) => {
    const englishFile = path.join(root, "guides", t.platform, `${t.slug}.mdx`);
    expect(fs.existsSync(englishFile)).toBe(true);
    const en = read(englishFile);
    const tr = read(t.file);
    const cards = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src", "i18n", "content", `${t.loc}.json`), "utf8")).guides;
    const card = cards[`${t.platform}/${t.slug}`];
    // The page header shows the card text, so the article's own frontmatter must agree with it.
    expect(tr.data.title).toBe(card.title);
    expect(tr.data.description).toBe(card.description);
    expect(tr.data.kind).toBe("curated");
    expect(tr.data.whatYouLearn?.length).toBe(en.data.whatYouLearn?.length);
    expect(Boolean(tr.data.bestFor)).toBe(Boolean(en.data.bestFor));
    expect(Boolean(tr.data.timeToComplete)).toBe(Boolean(en.data.timeToComplete));
    expect(shape(tr.content)).toEqual(shape(en.content));
    // "**原因：**本文" doesn't render bold in Markdown (closing ** between punctuation and a
    // letter); write "**原因**：本文".
    expect(badBoldClosers(tr.content)).toEqual([]);
  });
});
