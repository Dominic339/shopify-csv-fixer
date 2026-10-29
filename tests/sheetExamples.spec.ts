import { describe, expect, it } from "vitest";

import { SHEET_EXAMPLES } from "@/lib/guides/sheetExamples";
import { getAllGuides } from "@/lib/guidesRegistry";
import { ISSUE_META_REGISTRY } from "@/lib/validation/issueMetaRegistry";

const knownCodes = new Set(Object.values(ISSUE_META_REGISTRY).flatMap((m) => Object.keys(m)));

describe("guide sheet examples", () => {
  it("only describe issues the fixer knows", () => {
    for (const code of Object.keys(SHEET_EXAMPLES)) expect(knownCodes, code).toContain(code);
  });

  it("have rows as wide as their header and an actual change", () => {
    for (const [code, ex] of Object.entries(SHEET_EXAMPLES)) {
      for (const row of ex.before) expect(row.length, code).toBe(ex.cols.length);
      for (const row of ex.after) expect(row.length, code).toBe((ex.colsAfter ?? ex.cols).length);
      expect(JSON.stringify([ex.cols, ex.before]), code).not.toBe(JSON.stringify([ex.colsAfter ?? ex.cols, ex.after]));
    }
  });

  it("cover most issue guides", () => {
    const issueGuides = getAllGuides().filter((g) => g.kind === "issue" && g.issueCode);
    const covered = issueGuides.filter((g) => SHEET_EXAMPLES[g.issueCode!]);
    expect(covered.length / issueGuides.length).toBeGreaterThan(0.8);
  });
});
