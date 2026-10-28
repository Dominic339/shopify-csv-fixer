/**
 * Shopify accuracy regressions: each test pins a real-world import problem the fixer
 * used to get wrong. Runs the full pipeline (parse → validate/fix → output shaping).
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { processCsvText, resolveFormat } from "@/lib/processCsv";

const shopify = resolveFormat({ kind: "builtin", id: "shopify_products" })!;
const run = (csv: string, strict = false) => processCsvText(csv.trim(), shopify, { strictShopify: strict });
const errors = (res: ReturnType<typeof run>) => res.issues.filter((i) => i.severity === "error");
const SAMPLES = path.resolve(__dirname, "../public/samples");

describe("Shopify output columns", () => {
  it("never adds blank columns the file didn't have (blank cells erase data on overwrite)", () => {
    const res = run(`Handle,Title,Variant Price\nshirt,Shirt,10`);
    expect(res.fixedHeaders).toEqual(["Title", "URL handle", "Option1 name", "Option1 value", "Price"]);
  });

  it("keeps metafields, Collection, and market columns", () => {
    const res = run(
      `Title,URL handle,Collection,Material (product.metafields.custom.material),Price / Canada\nShirt,shirt,Summer,Cotton,15`
    );
    expect(res.fixedHeaders).toEqual(
      expect.arrayContaining(["Collection", "Material (product.metafields.custom.material)", "Price / Canada"])
    );
    expect(res.fixedRows[0]["Collection"]).toBe("Summer");
  });

  it("keeps a modern 'Barcodes' column and never outputs both Barcode and Barcodes", () => {
    const res = run(`Title,URL handle,Barcodes\nShirt,shirt,gtin:0123456789012`);
    expect(res.fixedHeaders).toContain("Barcodes");
    expect(res.fixedHeaders).not.toContain("Barcode");
    expect(res.fixedRows[0]["Barcodes"]).toBe("gtin:0123456789012");
  });

  it("maps legacy export columns instead of dropping them", () => {
    const res = run(
      `Handle,Title,Variant Taxable,Variant Requires Shipping,Variant Barcode,Variant Inventory Tracker,Variant Tax Code\nshirt,Shirt,FALSE,FALSE,123,shopify,P0000000`
    );
    const row = res.fixedRows[0];
    expect(row["Charge tax"]).toBe("false");
    expect(row["Requires shipping"]).toBe("false");
    expect(row["Barcode"]).toBe("123");
    expect(row["Inventory tracker"]).toBe("shopify");
    expect(row["Tax code"]).toBe("P0000000");
    expect(res.fixedHeaders).not.toContain("Variant Taxable");
  });

  it("keeps Google's category out of Shopify's Product category", () => {
    const res = run(`Title,URL handle,Google Shopping / Google Product Category\nShirt,shirt,212`);
    expect(res.fixedHeaders).not.toContain("Product category");
    expect(res.fixedRows[0]["Google Shopping / Google product category"]).toBe("212");
  });
});

describe("Shopify values", () => {
  it.each([
    ["12,50", "12.50"],
    ["€1.234,56", "1234.56"],
    ["$1,234.56", "1234.56"],
    ["19.9", "19.90"],
  ])("reads price %s as %s", (input, expected) => {
    const res = run(`Title,URL handle,Price\nShirt,shirt,"${input}"`);
    expect(res.fixedRows[0]["Price"]).toBe(expected);
  });

  it("leaves valid handles alone, including non-Latin ones", () => {
    const res = run(`Title,URL handle\nShirt,red-shirt-2\nФутболка,футболка\nシャツ,シャツ`);
    expect(res.fixedRows.map((r) => r["URL handle"])).toEqual(["red-shirt-2", "футболка", "シャツ"]);
    expect(res.fixesApplied.some((f) => f.includes("URL handle"))).toBe(false);
  });

  it("generates handles from non-Latin titles instead of failing", () => {
    const res = run(`Title,Price\nФутболка Синяя,10`);
    expect(res.fixedRows[0]["URL handle"]).toBe("футболка-синяя");
    expect(errors(res)).toEqual([]);
  });

  it("converts weights with units to whole grams", () => {
    const res = run(`Title,URL handle,Weight value (grams),Weight unit for display\nMug,mug,1.5 kg,KG`);
    expect(res.fixedRows[0]["Weight value (grams)"]).toBe("1500");
    expect(res.fixedRows[0]["Weight unit for display"]).toBe("kg");
  });

  it("does not add a Status column, and does not set Status on variant rows", () => {
    expect(run(`Title,URL handle\nShirt,shirt`).fixedHeaders).not.toContain("Status");

    const res = run(
      `Title,URL handle,Status,Option1 name,Option1 value,Price\nShirt,shirt,,Size,S,10\n,shirt,,,M,10`
    );
    expect(res.fixedRows.map((r) => r["Status"])).toEqual(["draft", ""]);
  });
});

describe("Shopify variant structure", () => {
  it("accepts Shopify's own template with no issues", () => {
    const csv = fs.readFileSync(path.join(SAMPLES, "shopify_product_template.csv"), "utf-8");
    expect(run(csv, true).issues).toEqual([]);
  });

  it("treats a single-variant product without options as a Default Title variant", () => {
    const res = run(`Title,URL handle,SKU,Price\nMug,mug,MUG-1,8`);
    expect(errors(res)).toEqual([]);
    expect(res.fixedRows[0]["Option1 value"]).toBe("Default Title");
  });

  it("blocks multi-variant rows that have no option values (would delete variants)", () => {
    const res = run(`Title,URL handle,SKU,Price\nShirt,shirt,S-1,10\n,shirt,S-2,10`);
    expect(errors(res).map((i) => i.code)).toContain("shopify/missing_option1_for_variant_data");
  });

  it("inherits option names from the product row", () => {
    const res = run(
      `Title,URL handle,Option1 name,Option1 value,Price\nShirt,shirt,Size,S,10\n,shirt,,M,10\n,shirt,,L,10`,
      true
    );
    expect(res.issues).toEqual([]);
  });

  it("warns (not blocks) on a blank price, which imports as 0.00", () => {
    const res = run(`Title,URL handle,SKU,Price\nMug,mug,MUG-1,`, true);
    const blank = res.issues.find((i) => i.code === "shopify/blank_price");
    expect(blank?.severity).toBe("warning");
  });
});
