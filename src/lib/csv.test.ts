import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv parse issues", () => {
  it("warns about extra and missing cells, with the row they are on", () => {
    const { parseIssues } = parseCsv("A,B\n1,2,3\n4\n");
    expect(parseIssues.map((i) => [i.code, i.severity, i.rowIndex])).toEqual([
      ["csv/too_many_fields", "warning", 0],
      ["csv/too_few_fields", "warning", 1],
    ]);
    expect(parseIssues[0].message).toMatch(/^Row 1 has more cells/);
  });

  it("treats a quote that is never closed as an error", () => {
    const { parseIssues } = parseCsv('A,B\n"open,1\n2,3\n');
    expect(parseIssues.some((i) => i.code === "csv/broken_quotes" && i.severity === "error")).toBe(true);
  });

  it("reports nothing for a well-formed or single-column file", () => {
    expect(parseCsv("A,B\n1,2\n").parseIssues).toEqual([]);
    expect(parseCsv("Email\na@example.com\n").parseIssues).toEqual([]);
  });
});
