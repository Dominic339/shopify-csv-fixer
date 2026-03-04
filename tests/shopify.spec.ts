/**
 * Shopify CSV Validator – Automated Test Harness
 *
 * Covers:
 *   1. Header parity with SHOPIFY_PRODUCT_TEMPLATE_HEADERS
 *   2. Issue count stability (snapshot)
 *   3. fixesApplied includes expected normalisation types
 *   4. Exported CSV maintains canonical column ordering
 *   5. Stress test with the large sample CSV
 *   6. Golden-file snapshots: issue summary, fixesApplied summary, header order
 *
 * Tests FAIL when:
 *   - A header is added/removed from the canonical list
 *   - Strict validation changes unexpectedly
 *   - Fix logic silently breaks
 *
 * Run:  npm test
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseCsv } from "@/lib/csv";
import { SHOPIFY_PRODUCT_TEMPLATE_HEADERS, shopifyProductsFormat } from "@/lib/formats/builtins/shopifyProducts";
import { validateAndFixShopifyOptimizer } from "@/lib/shopifyOptimizer";
import { validateShopifyStrict } from "@/lib/shopifyStrictValidate";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SAMPLES = path.resolve(__dirname, "../public/samples");

function readCsv(filename: string) {
  const text = fs.readFileSync(path.join(SAMPLES, filename), "utf-8");
  return parseCsv(text);
}

// ---------------------------------------------------------------------------
// 1.  Header parity
// ---------------------------------------------------------------------------

describe("SHOPIFY_PRODUCT_TEMPLATE_HEADERS", () => {
  it("official template CSV has exact header parity with the exported constant", () => {
    const { headers } = readCsv("shopify_product_template.csv");
    expect(headers).toEqual(SHOPIFY_PRODUCT_TEMPLATE_HEADERS);
  });

  it("constant has the expected number of columns (matches official template)", () => {
    // Assert against the actual template CSV so the test catches additions/removals
    const { headers } = readCsv("shopify_product_template.csv");
    expect(SHOPIFY_PRODUCT_TEMPLATE_HEADERS).toHaveLength(headers.length);
  });

  it("required anchor columns are present and in correct relative order", () => {
    const anchors = ["Title", "URL handle", "SKU", "Price", "Inventory quantity", "Product image URL", "SEO title"];
    const idx = anchors.map((a) => SHOPIFY_PRODUCT_TEMPLATE_HEADERS.indexOf(a));
    // All must exist
    for (let i = 0; i < anchors.length; i++) {
      expect(idx[i], `"${anchors[i]}" must be in the headers`).toBeGreaterThanOrEqual(0);
    }
    // Must be in strictly increasing index order
    for (let i = 1; i < idx.length; i++) {
      expect(idx[i], `"${anchors[i]}" must come after "${anchors[i - 1]}"`).toBeGreaterThan(idx[i - 1]!);
    }
  });

  it("header list snapshot is stable – fails if any column is added or removed", () => {
    expect(SHOPIFY_PRODUCT_TEMPLATE_HEADERS).toMatchSnapshot("canonical-header-list");
  });
});

// ---------------------------------------------------------------------------
// 2.  Issue count stability (snapshot)
// ---------------------------------------------------------------------------

describe("Issue count stability", () => {
  it("official template – issue counts are stable (snapshot)", () => {
    const { headers, rows } = readCsv("shopify_product_template.csv");
    const result = shopifyProductsFormat.apply(headers, rows);

    const counts = {
      errors: result.issues.filter((i) => i.severity === "error").length,
      warnings: result.issues.filter((i) => i.severity === "warning").length,
      info: result.issues.filter((i) => i.severity === "info").length,
      total: result.issues.length,
    };

    expect(counts).toMatchSnapshot("issue-counts");
  });

  it("messy export 1 – produces at least one error or warning", () => {
    const { headers, rows } = readCsv("messy_shopify_export_1_classic_tee.csv");
    const result = shopifyProductsFormat.apply(headers, rows);
    const problemCount = result.issues.filter((i) => i.severity === "error" || i.severity === "warning").length;
    expect(problemCount).toBeGreaterThan(0);
  });

  it("duplicate SKU file – detects cross-product SKU duplication", () => {
    const { headers, rows } = readCsv("messy_shopify_export_2_duplicate_sku.csv");
    const result = validateAndFixShopifyOptimizer(headers, rows, { strict: false });
    const skuIssues = result.issues.filter((i) =>
      (i as any).code?.includes("sku") || (i as any).code?.includes("duplicate")
    );
    expect(skuIssues.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 3.  fixesApplied includes expected normalisation types
// ---------------------------------------------------------------------------

describe("fixesApplied normalization types", () => {
  it("result is an array of strings", () => {
    const { headers, rows } = readCsv("shopify_product_template.csv");
    const result = shopifyProductsFormat.apply(headers, rows);
    expect(Array.isArray(result.fixesApplied)).toBe(true);
    expect(result.fixesApplied.every((f) => typeof f === "string")).toBe(true);
  });

  it("includes at least one recognised normalisation action", () => {
    const { headers, rows } = readCsv("shopify_product_template.csv");
    const result = shopifyProductsFormat.apply(headers, rows);
    const keywords = ["normalized", "normalised", "filled", "canonical", "shopify:", "generated", "mapped", "enforced"];
    const hasKnownAction = result.fixesApplied.some((f) =>
      keywords.some((kw) => f.toLowerCase().includes(kw))
    );
    expect(hasKnownAction).toBe(true);
  });

  it("official template produces fixesApplied – safe normalizations always fire on this file", () => {
    // The official template has Status='Active', Continue='DENY' etc. that need normalization.
    const { headers, rows } = readCsv("shopify_product_template.csv");
    const result = shopifyProductsFormat.apply(headers, rows);
    expect(result.fixesApplied.length).toBeGreaterThan(0);
  });

  it("fixesApplied snapshot is stable", () => {
    const { headers, rows } = readCsv("shopify_product_template.csv");
    const result = shopifyProductsFormat.apply(headers, rows);
    expect(result.fixesApplied).toMatchSnapshot("fixes-applied");
  });
});

// ---------------------------------------------------------------------------
// 4.  Exported CSV column ordering
// ---------------------------------------------------------------------------

describe("Export column ordering", () => {
  it("fixedHeaders contains every column from SHOPIFY_PRODUCT_TEMPLATE_HEADERS (no dropped columns)", () => {
    const { headers, rows } = readCsv("shopify_product_template.csv");
    const result = shopifyProductsFormat.apply(headers, rows);
    const fixedSet = new Set(result.fixedHeaders);
    for (const col of SHOPIFY_PRODUCT_TEMPLATE_HEADERS) {
      expect(fixedSet.has(col), `column "${col}" should be present in fixedHeaders`).toBe(true);
    }
  });

  it("fixedHeaders snapshot is stable – fails if engine ordering changes unexpectedly", () => {
    const { headers, rows } = readCsv("shopify_product_template.csv");
    const result = shopifyProductsFormat.apply(headers, rows);
    expect(result.fixedHeaders).toMatchSnapshot("export-header-order");
  });

  it("every fixedRow only contains keys present in fixedHeaders", () => {
    const { headers, rows } = readCsv("shopify_product_template.csv");
    const result = shopifyProductsFormat.apply(headers, rows);
    const headerSet = new Set(result.fixedHeaders);
    for (const row of result.fixedRows) {
      for (const key of Object.keys(row)) {
        expect(headerSet.has(key), `unexpected column "${key}" in fixedRows`).toBe(true);
      }
    }
  });

  it("fixedRows count matches input row count (no rows silently dropped)", () => {
    const { headers, rows } = readCsv("shopify_product_template.csv");
    const result = shopifyProductsFormat.apply(headers, rows);
    expect(result.fixedRows.length).toBe(rows.length);
  });
});

// ---------------------------------------------------------------------------
// 5.  Strict mode gating
// ---------------------------------------------------------------------------

describe("Strict mode gating", () => {
  it("strict=false produces fewer or equal issues than strict=true (on template CSV)", () => {
    const { headers, rows } = readCsv("shopify_product_template.csv");
    const baseResult = validateAndFixShopifyOptimizer(headers, rows, { strict: false });
    const strictResult = validateAndFixShopifyOptimizer(headers, rows, { strict: true });
    expect(baseResult.issues.length).toBeLessThanOrEqual(strictResult.issues.length);
  });

  it("strict validator is callable independently and returns an array", () => {
    const { headers, rows } = readCsv("shopify_product_template.csv");
    const strictIssues = validateShopifyStrict(headers, rows);
    expect(Array.isArray(strictIssues)).toBe(true);
  });

  it("strict mode issue count snapshot is stable (changing strict rules breaks this test)", () => {
    const { headers, rows } = readCsv("shopify_product_template.csv");
    const result = validateAndFixShopifyOptimizer(headers, rows, { strict: true });
    const counts = {
      errors: result.issues.filter((i) => i.severity === "error").length,
      warnings: result.issues.filter((i) => i.severity === "warning").length,
      total: result.issues.length,
    };
    expect(counts).toMatchSnapshot("strict-issue-counts");
  });
});

// ---------------------------------------------------------------------------
// 6.  Golden-file snapshots
// ---------------------------------------------------------------------------

describe("Golden-file snapshots", () => {
  it("issue summary snapshot (code + severity + column, sorted)", () => {
    const { headers, rows } = readCsv("shopify_product_template.csv");
    const result = shopifyProductsFormat.apply(headers, rows);

    const summary = result.issues
      .map((i) => ({
        severity: i.severity,
        code: (i as any).code ?? "",
        column: i.column,
      }))
      .sort((a, b) =>
        `${a.severity}|${a.code}|${a.column}`.localeCompare(`${b.severity}|${b.code}|${b.column}`)
      );

    expect(summary).toMatchSnapshot("issue-summary");
  });

  it("fixesApplied summary snapshot", () => {
    const { headers, rows } = readCsv("shopify_product_template.csv");
    const result = shopifyProductsFormat.apply(headers, rows);
    expect(result.fixesApplied).toMatchSnapshot("fixes-applied-summary");
  });

  it("final export header order snapshot", () => {
    const { headers, rows } = readCsv("shopify_product_template.csv");
    const result = shopifyProductsFormat.apply(headers, rows);
    expect(result.fixedHeaders).toMatchSnapshot("final-export-header-order");
  });
});

// ---------------------------------------------------------------------------
// 7.  Stress test – large sample CSV (5 500 rows)
// ---------------------------------------------------------------------------

describe("Stress test", () => {
  it(
    "processes shopify_stress_test_5500_rows.csv without throwing",
    { timeout: 60_000 },
    () => {
      const filePath = path.join(SAMPLES, "shopify_stress_test_5500_rows.csv");
      if (!fs.existsSync(filePath)) {
        console.warn("shopify_stress_test_5500_rows.csv not found – skipping stress test");
        return;
      }

      const text = fs.readFileSync(filePath, "utf-8");
      const { headers, rows } = parseCsv(text);

      expect(rows.length).toBeGreaterThan(100);

      const result = shopifyProductsFormat.apply(headers, rows);

      expect(Array.isArray(result.fixedHeaders)).toBe(true);
      expect(Array.isArray(result.fixedRows)).toBe(true);
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.fixesApplied)).toBe(true);
      // Row count must be preserved
      expect(result.fixedRows.length).toBe(rows.length);
      // Core Shopify columns must be present in output (extra legacy columns are appended)
      const fixedSet = new Set(result.fixedHeaders);
      const coreColumns = ["Title", "SKU", "Price", "Inventory quantity", "Status"];
      for (const col of coreColumns) {
        expect(fixedSet.has(col), `core column "${col}" must be in stress test output`).toBe(true);
      }
      // Issue list is valid
      expect(result.issues.every((i) => ["error", "warning", "info"].includes(i.severity))).toBe(true);
    }
  );
});
