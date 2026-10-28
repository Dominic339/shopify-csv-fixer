/**
 * Tests for src/lib/csvInspector.ts
 */
import { describe, it, expect } from "vitest";
import { detectPlatform, inspectCsv } from "@/lib/csvInspector";

// ---------------------------------------------------------------------------
// Basic stats
// ---------------------------------------------------------------------------

describe("inspectCsv: basic stats", () => {
  it("counts rows and columns correctly", () => {
    const csv = "A,B,C\n1,2,3\n4,5,6\n";
    const result = inspectCsv(csv);
    expect(result.rowCount).toBe(2);
    expect(result.columnCount).toBe(3);
  });

  it("detects comma delimiter", () => {
    const result = inspectCsv("A,B,C\n1,2,3");
    expect(result.delimiterGuess).toBe(",");
  });

  it("detects semicolon delimiter", () => {
    const result = inspectCsv("A;B;C\n1;2;3");
    expect(result.delimiterGuess).toBe(";");
  });

  it("detects tab delimiter", () => {
    const result = inspectCsv("A\tB\tC\n1\t2\t3");
    expect(result.delimiterGuess).toBe("\t");
  });
});

// ---------------------------------------------------------------------------
// Duplicate headers
// ---------------------------------------------------------------------------

describe("inspectCsv: duplicate headers", () => {
  it("detects duplicate header names", () => {
    const csv = "Title,Price,Title\nProd A,10,Prod A\n";
    const result = inspectCsv(csv);
    expect(result.duplicateHeaders).toContain("Title");
  });

  it("reports no duplicates for unique headers", () => {
    const csv = "Title,Price,SKU\nProd A,10,SKU-1\n";
    const result = inspectCsv(csv);
    expect(result.duplicateHeaders).toHaveLength(0);
  });

  it("is case-insensitive when detecting duplicates", () => {
    const csv = "title,TITLE,Price\nA,B,10\n";
    const result = inspectCsv(csv);
    expect(result.duplicateHeaders.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Blank rows
// ---------------------------------------------------------------------------

describe("inspectCsv: blank rows", () => {
  it("detects blank rows (1-based index)", () => {
    const csv = "A,B\n1,2\n\n3,4\n";
    const result = inspectCsv(csv);
    expect(result.blankRows).toContain(2); // 2nd data row is blank
  });

  it("reports no blank rows when all rows have data", () => {
    const csv = "A,B\n1,2\n3,4\n";
    const result = inspectCsv(csv);
    expect(result.blankRows).toHaveLength(0);
  });

  it("handles file with only blank data rows", () => {
    const csv = "A,B\n\n\n";
    const result = inspectCsv(csv);
    expect(result.blankRows.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Empty columns
// ---------------------------------------------------------------------------

describe("inspectCsv: empty columns", () => {
  it("detects completely empty columns", () => {
    const csv = "Title,Notes,Price\nProd A,,10\nProd B,,20\n";
    const result = inspectCsv(csv);
    expect(result.emptyColumns).toContain("Notes");
  });

  it("does not flag columns that have at least one value", () => {
    const csv = "Title,Notes\nProd A,Some note\nProd B,\n";
    const result = inspectCsv(csv);
    expect(result.emptyColumns).not.toContain("Notes");
  });

  it("reports empty columns array for clean CSV", () => {
    const csv = "Title,Price\nProd A,10\n";
    const result = inspectCsv(csv);
    expect(result.emptyColumns).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Inconsistent column counts
// ---------------------------------------------------------------------------

describe("inspectCsv: inconsistent column counts", () => {
  it("detects rows with fewer columns than expected", () => {
    const csv = "A,B,C\n1,2,3\n4,5\n7,8,9\n";
    const result = inspectCsv(csv);
    const inconsistent = result.inconsistentColumnCounts.find((r) => r.row === 2);
    expect(inconsistent).toBeDefined();
    expect(inconsistent?.expected).toBe(3);
    expect(inconsistent?.found).toBe(2);
  });

  it("detects rows with more columns than expected", () => {
    const csv = "A,B\n1,2\n3,4,5\n";
    const result = inspectCsv(csv);
    const inconsistent = result.inconsistentColumnCounts.find((r) => r.row === 2);
    expect(inconsistent).toBeDefined();
    expect(inconsistent?.found).toBe(3);
  });

  it("reports no inconsistencies for uniform CSV", () => {
    const csv = "A,B,C\n1,2,3\n4,5,6\n";
    const result = inspectCsv(csv);
    expect(result.inconsistentColumnCounts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Encoding hints
// ---------------------------------------------------------------------------

describe("inspectCsv: encoding hints", () => {
  it("detects UTF-8 BOM", () => {
    const csvWithBom = "\uFEFFTitle,Price\nProd,10\n";
    const result = inspectCsv(csvWithBom);
    const bomHint = result.suspiciousEncodingHints.some((h) => h.toLowerCase().includes("bom"));
    expect(bomHint).toBe(true);
  });

  it("detects Unicode replacement character", () => {
    const csv = "Title,Price\nProd\uFFFD,10\n";
    const result = inspectCsv(csv);
    const hint = result.suspiciousEncodingHints.some((h) => h.includes("\uFFFD") || h.toLowerCase().includes("replacement"));
    expect(hint).toBe(true);
  });

  it("returns no encoding hints for clean ASCII CSV", () => {
    const csv = "Title,Price\nProduct A,10.00\n";
    const result = inspectCsv(csv);
    expect(result.suspiciousEncodingHints).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Empty file
// ---------------------------------------------------------------------------

describe("inspectCsv: empty or minimal input", () => {
  it("handles empty string", () => {
    const result = inspectCsv("");
    expect(result.rowCount).toBe(0);
    expect(result.columnCount).toBe(0);
  });

  it("handles whitespace-only string", () => {
    const result = inspectCsv("   \n  \n");
    expect(result.rowCount).toBe(0);
  });

  it("handles header-only CSV (no data rows)", () => {
    const result = inspectCsv("Title,Price,SKU\n");
    expect(result.rowCount).toBe(0);
    expect(result.columnCount).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Quoted cells, header problems and platform detection
// ---------------------------------------------------------------------------

describe("inspectCsv: quoted cells", () => {
  it("keeps line breaks and delimiters inside quoted cells in one row", () => {
    const csv = 'Handle,Title,Body (HTML)\nshirt,Shirt,"<p>Soft, warm</p>\n<p>Machine wash</p>"\ncap,Cap,"Plain"\n';
    const result = inspectCsv(csv);
    expect(result.rowCount).toBe(2);
    expect(result.inconsistentColumnCounts).toHaveLength(0);
    expect(result.unclosedQuote).toBe(false);
  });

  it("guesses the delimiter from the header, not from commas in the data", () => {
    const csv = 'A;B\n"one, two, three";x\n"four, five";y\n';
    expect(inspectCsv(csv).delimiterGuess).toBe(";");
  });

  it("reports an unclosed quote", () => {
    expect(inspectCsv('A,B\n"open,1\n2,3\n').unclosedQuote).toBe(true);
  });

  it("reports total counts beyond the display caps", () => {
    const csv = "A,B\n" + "1\n".repeat(30);
    const result = inspectCsv(csv);
    expect(result.inconsistentRowCount).toBe(30);
    expect(result.inconsistentColumnCounts).toHaveLength(20);
  });
});

describe("inspectCsv: header problems", () => {
  it("finds empty and padded header names", () => {
    const result = inspectCsv("Title,,Price \nA,x,1\n");
    expect(result.emptyHeaderColumns).toEqual([2]);
    expect(result.paddedHeaders).toEqual(["Price"]);
  });

  it("ignores the BOM when reading headers", () => {
    const result = inspectCsv("﻿Handle,Title\nshirt,Shirt\n");
    expect(result.paddedHeaders).toEqual([]);
    expect(result.detectedPlatform).toBe("shopify_products");
  });
});

describe("detectPlatform", () => {
  it.each([
    [["Handle", "Title", "Option1 Name", "Variant Price"], "shopify_products"],
    [["Title", "URL handle", "Price", "SKU"], "shopify_products"],
    [["ID", "Type", "SKU", "Name", "Published", "Regular price"], "woocommerce_products"],
    [["TITLE", "DESCRIPTION", "PRICE", "QUANTITY", "TAGS"], "etsy_listings"],
    [["*Action(SiteID=US|Country=US|Currency=USD|Version=1193)", "Title"], "ebay_listings"],
    [["sku", "product-id", "product-id-type", "price"], "amazon_inventory_loader"],
    [["email", "first_name"], null],
  ])("%j -> %s", (headers, expected) => {
    expect(detectPlatform(headers as string[])).toBe(expected);
  });
});
