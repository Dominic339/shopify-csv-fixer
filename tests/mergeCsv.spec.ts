/**
 * Tests for src/lib/mergeCsv.ts
 */
import { describe, it, expect } from "vitest";
import { mergeCsvFiles, mergeCsvFilesAdvanced, getMergeRowLimit } from "@/lib/mergeCsv";

// ---------------------------------------------------------------------------
// Row limit helpers
// ---------------------------------------------------------------------------

describe("getMergeRowLimit", () => {
  it("returns 200 for free", () => {
    expect(getMergeRowLimit("free")).toBe(200);
  });
  it("returns 2000 for basic", () => {
    expect(getMergeRowLimit("basic")).toBe(2000);
  });
  it("returns null (unlimited) for advanced", () => {
    expect(getMergeRowLimit("advanced")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Original mergeCsvFiles (backwards compat)
// ---------------------------------------------------------------------------

describe("mergeCsvFiles (original)", () => {
  it("combines rows from both files", () => {
    const result = mergeCsvFiles(
      ["A", "B"],
      [{ A: "1", B: "2" }],
      ["A", "C"],
      [{ A: "3", C: "4" }]
    );
    expect(result.rows).toHaveLength(2);
  });

  it("produces union of headers", () => {
    const result = mergeCsvFiles(["A", "B"], [], ["B", "C"], []);
    expect(result.headers).toContain("A");
    expect(result.headers).toContain("B");
    expect(result.headers).toContain("C");
  });
});

// ---------------------------------------------------------------------------
// mergeCsvFilesAdvanced — append mode
// ---------------------------------------------------------------------------

describe("mergeCsvFilesAdvanced: append mode", () => {
  const headersA = ["Handle", "Title", "Price"];
  const rowsA = [
    { Handle: "prod-1", Title: "Product 1", Price: "10.00" },
    { Handle: "prod-2", Title: "Product 2", Price: "20.00" },
  ];
  const headersB = ["Handle", "Title", "Price"];
  const rowsB = [
    { Handle: "prod-3", Title: "Product 3", Price: "30.00" },
  ];

  it("combines all rows", () => {
    const result = mergeCsvFilesAdvanced(headersA, rowsA, headersB, rowsB, { mode: "append", plan: "advanced" });
    expect(result.rowsOutput).toBe(3);
    expect(result.rows).toHaveLength(3);
  });

  it("reports correct per-file row counts", () => {
    const result = mergeCsvFilesAdvanced(headersA, rowsA, headersB, rowsB, { mode: "append", plan: "advanced" });
    expect(result.rowsA).toBe(2);
    expect(result.rowsB).toBe(1);
  });

  it("reports zero duplicates in append mode", () => {
    const result = mergeCsvFilesAdvanced(headersA, rowsA, headersB, rowsB, { mode: "append", plan: "advanced" });
    expect(result.duplicatesFound).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// mergeCsvFilesAdvanced — dedupe mode
// ---------------------------------------------------------------------------

describe("mergeCsvFilesAdvanced: dedupe mode — keep_first", () => {
  const headers = ["Handle", "Title", "Price"];
  const rowsA = [
    { Handle: "prod-1", Title: "Product 1", Price: "10.00" },
    { Handle: "prod-2", Title: "Product 2", Price: "20.00" },
  ];
  const rowsB = [
    { Handle: "prod-1", Title: "Product 1 Updated", Price: "15.00" },
    { Handle: "prod-3", Title: "Product 3", Price: "30.00" },
  ];

  it("removes duplicates by key", () => {
    const result = mergeCsvFilesAdvanced(headers, rowsA, headers, rowsB, {
      mode: "dedupe",
      dedupeKey: "Handle",
      conflictRule: "keep_first",
      plan: "advanced",
    });
    expect(result.duplicatesFound).toBe(1);
    expect(result.rowsOutput).toBe(3); // prod-1, prod-2, prod-3
  });

  it("keeps file A version when keep_first", () => {
    const result = mergeCsvFilesAdvanced(headers, rowsA, headers, rowsB, {
      mode: "dedupe",
      dedupeKey: "Handle",
      conflictRule: "keep_first",
      plan: "advanced",
    });
    const prod1 = result.rows.find((r) => r["Handle"] === "prod-1");
    expect(prod1?.["Title"]).toBe("Product 1");
    expect(prod1?.["Price"]).toBe("10.00");
  });
});

describe("mergeCsvFilesAdvanced: dedupe mode — keep_second", () => {
  const headers = ["Handle", "Title", "Price"];
  const rowsA = [{ Handle: "prod-1", Title: "Product 1", Price: "10.00" }];
  const rowsB = [{ Handle: "prod-1", Title: "Product 1 v2", Price: "12.00" }];

  it("keeps file B version when keep_second", () => {
    const result = mergeCsvFilesAdvanced(headers, rowsA, headers, rowsB, {
      mode: "dedupe",
      dedupeKey: "Handle",
      conflictRule: "keep_second",
      plan: "advanced",
    });
    const prod1 = result.rows.find((r) => r["Handle"] === "prod-1");
    expect(prod1?.["Title"]).toBe("Product 1 v2");
  });
});

describe("mergeCsvFilesAdvanced: dedupe mode — prefer_nonempty", () => {
  const headers = ["Handle", "Title", "Description", "Price"];
  const rowsA = [{ Handle: "prod-1", Title: "Product 1", Description: "", Price: "10.00" }];
  const rowsB = [{ Handle: "prod-1", Title: "", Description: "Great product", Price: "" }];

  it("merges non-empty values from both rows", () => {
    const result = mergeCsvFilesAdvanced(headers, rowsA, headers, rowsB, {
      mode: "dedupe",
      dedupeKey: "Handle",
      conflictRule: "prefer_nonempty",
      plan: "advanced",
    });
    const row = result.rows.find((r) => r["Handle"] === "prod-1");
    expect(row?.["Title"]).toBe("Product 1"); // from A (A wins since it's nonempty)
    expect(row?.["Description"]).toBe("Great product"); // from B (A was empty)
    expect(row?.["Price"]).toBe("10.00"); // from A (A wins)
  });
});

// ---------------------------------------------------------------------------
// Header mismatch warning
// ---------------------------------------------------------------------------

describe("mergeCsvFilesAdvanced: header mismatch", () => {
  it("warns when headers differ significantly", () => {
    const result = mergeCsvFilesAdvanced(
      ["A", "B"],
      [{ A: "1", B: "2" }],
      ["C", "D"],
      [{ C: "3", D: "4" }],
      { mode: "append", plan: "advanced" }
    );
    expect(result.warnings.length).toBeGreaterThan(0);
    const hasHeaderWarning = result.warnings.some((w) => w.toLowerCase().includes("header"));
    expect(hasHeaderWarning).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Row limit enforcement
// ---------------------------------------------------------------------------

describe("mergeCsvFilesAdvanced: row limit", () => {
  const headers = ["Handle"];
  const makeRows = (n: number, prefix: string) =>
    Array.from({ length: n }, (_, i) => ({ Handle: `${prefix}-${i}` }));

  it("truncates rows for free plan", () => {
    const rowsA = makeRows(150, "a");
    const rowsB = makeRows(150, "b");
    const result = mergeCsvFilesAdvanced(headers, rowsA, headers, rowsB, {
      mode: "append",
      plan: "free",
    });
    expect(result.truncated).toBe(true);
    expect(result.rows.length).toBeLessThanOrEqual(200);
  });

  it("does not truncate for advanced plan", () => {
    const rowsA = makeRows(150, "a");
    const rowsB = makeRows(150, "b");
    const result = mergeCsvFilesAdvanced(headers, rowsA, headers, rowsB, {
      mode: "append",
      plan: "advanced",
    });
    expect(result.truncated).toBe(false);
    expect(result.rows).toHaveLength(300);
  });
});

// ---------------------------------------------------------------------------
// No dedupe key fallback
// ---------------------------------------------------------------------------

describe("mergeCsvFilesAdvanced: fallback without dedupe key", () => {
  const headers = ["Handle"];
  const rows = [{ Handle: "prod-1" }];

  it("falls back to append when no dedupe key specified", () => {
    const result = mergeCsvFilesAdvanced(headers, rows, headers, rows, {
      mode: "dedupe",
      plan: "advanced",
      // no dedupeKey
    });
    expect(result.rows).toHaveLength(2); // no deduplication
    expect(result.warnings.some((w) => w.toLowerCase().includes("key"))).toBe(true);
  });

  it("falls back when dedupe key not found in headers", () => {
    const result = mergeCsvFilesAdvanced(headers, rows, headers, rows, {
      mode: "dedupe",
      dedupeKey: "NonExistentKey",
      plan: "advanced",
    });
    expect(result.rows).toHaveLength(2);
  });
});
