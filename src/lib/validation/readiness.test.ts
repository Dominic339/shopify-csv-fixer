import { describe, expect, it } from "vitest";
import type { CsvIssue } from "@/lib/formats/types";
import { computeReadinessSummary } from "./readiness";

const issue = (code: string, rowIndex: number): CsvIssue => ({ rowIndex, column: "Option1 Value", message: code, severity: "error", code });

describe("computeReadinessSummary", () => {
  it("treats variants with the same option combination as blocking, since Shopify rejects them", () => {
    const r = computeReadinessSummary([issue("shopify/options_not_unique", 1), issue("shopify/options_not_unique", 2)], "shopify_products");
    expect(r.blockingErrors).toBe(2);
    expect(r.blockingGroups.map((g) => g.code)).toEqual(["shopify/options_not_unique"]);
  });

  it("ignores warnings", () => {
    const r = computeReadinessSummary([{ ...issue("shopify/options_not_unique", 1), severity: "warning" }], "shopify_products");
    expect(r.blockingErrors).toBe(0);
  });
});
