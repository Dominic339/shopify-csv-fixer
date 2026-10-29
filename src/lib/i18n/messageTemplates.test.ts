// The message translation layer only works if every message the validators produce
// matches an extracted template. These tests run real files through every format.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractTemplates } from "../../../scripts/i18n-messages";
import templates from "@/i18n/messages/templates.json";
import { matchTemplate, translateMessage } from "@/lib/i18n/messages";
import { parseCsv } from "@/lib/csv";
import { getAllFormats } from "@/lib/formats";
import { applyFormatToParsedCsv } from "@/lib/formats/engine";
import { convertCsv, CONVERT_FORMAT_OPTIONS } from "@/lib/convertCsv";
import { LANDING_DEMOS } from "@/lib/landing/demos";

const root = process.cwd();

function sampleFiles(): string[] {
  const dirs = ["public/samples", "tests/e2e/fixtures"];
  const files = dirs.flatMap((d) => fs.readdirSync(path.join(root, d)).filter((f) => f.endsWith(".csv")).map((f) => path.join(root, d, f)));
  return [
    ...files.filter((f) => !f.includes("5500")).map((f) => fs.readFileSync(f, "utf8")),
    ...Object.values(LANDING_DEMOS).map((d) => d.csv),
  ];
}

describe("message templates", () => {
  it("templates.json is up to date (run: npx tsx scripts/i18n-messages.ts)", () => {
    expect(templates).toEqual(extractTemplates(root));
  });

  it("every message the validators produce matches a template", () => {
    const unmatched = new Set<string>();
    const check = (m?: string) => {
      if (m && !matchTemplate(m)) unmatched.add(m);
    };
    const builtins = getAllFormats().filter((f) => f.source === "builtin");
    for (const csv of sampleFiles()) {
      const parsed = parseCsv(csv);
      parsed.parseIssues.forEach((i) => check(i.message));
      for (const format of builtins) {
        const res = applyFormatToParsedCsv(parsed.headers, parsed.rows, format);
        res.issues.forEach((i) => {
          check(i.message);
          check(i.suggestion);
        });
        res.fixesApplied.forEach(check);
      }
      for (const from of CONVERT_FORMAT_OPTIONS) {
        for (const to of CONVERT_FORMAT_OPTIONS) {
          if (from.id === to.id) continue;
          try {
            convertCsv(parsed.headers, parsed.rows, from.id, to.id).warnings.forEach(check);
          } catch {
            // Not every file is valid input for every source format.
          }
        }
      }
    }
    expect([...unmatched]).toEqual([]);
  });

  it("fills captured values into the translation, in any order", () => {
    const dict = { 'Row {0}: URL handle "{1}" was changed to "{2}".': 'Zeile {0}: Der URL-Handle „{1}" wurde in „{2}" geändert.' };
    expect(translateMessage('Row 4: URL handle "My Shirt" was changed to "my-shirt".', dict)).toBe('Zeile 4: Der URL-Handle „My Shirt" wurde in „my-shirt" geändert.');
    expect(translateMessage("Something unknown", dict)).toBe("Something unknown");
    expect(translateMessage("Row 1: Title is blank.", null)).toBe("Row 1: Title is blank.");
  });
});
