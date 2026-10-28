import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv";
import { getAllFormats } from "@/lib/formats";
import { applyFormatToParsedCsv } from "@/lib/formats/engine";
import { ISSUE_META_REGISTRY } from "@/lib/validation/issueMetaRegistry";
import { LANDING_DEMOS } from "./demos";
import { PLATFORM_LANDINGS } from "./platforms";

describe("platform landing pages", () => {
  for (const [slug, landing] of Object.entries(PLATFORM_LANDINGS)) {
    it(`${slug}: the demo shows real fixes and real problems`, () => {
      const demo = LANDING_DEMOS[slug];
      expect(demo.formatId).toBe(landing.presetId);
      expect(ISSUE_META_REGISTRY[landing.presetId]).toBeDefined();

      const format = getAllFormats().find((f) => f.id === demo.formatId)!;
      const parsed = parseCsv(demo.csv);
      expect(parsed.parseIssues).toEqual([]);
      const result = applyFormatToParsedCsv(parsed.headers, parsed.rows, format);
      expect(result.fixesApplied.length).toBeGreaterThan(0);
      expect(result.issues.filter((i) => i.severity !== "info").length).toBeGreaterThan(0);
    });
  }
});
