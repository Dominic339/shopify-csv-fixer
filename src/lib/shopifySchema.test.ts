// Unit tests for locale-aware number parsing and Shopify handle rules.
import { describe, it, expect } from "vitest";
import {
  canonicalizeShopifyProductCsv,
  isValidShopifyHandle,
  parseLocaleNumber,
  slugifyShopifyHandle,
} from "@/lib/shopifySchema";

describe("parseLocaleNumber", () => {
  it.each([
    ["19.99", 19.99],
    ["$1,234.56", 1234.56],
    ["1,234", 1234],
    ["€12,50", 12.5],
    ["12,5", 12.5],
    ["0,50", 0.5],
    ["1.234,56 €", 1234.56],
    ["1.234.567", 1234567],
    ["12 345,67", 12345.67],
    ["12 345,67", 12345.67],
    ["CHF 1'299.00", 1299],
    ["£ 9", 9],
    ["-5", -5],
    ["10 USD", 10],
    ["R$ 49,90", 49.9],
    ["1299 kr", 1299],
  ])("%s → %s", (input, expected) => {
    expect(parseLocaleNumber(input)).toBeCloseTo(expected, 6);
  });

  it.each(["", "free", "12abc34", "1,23,4", "1.2.3,4", "--5", "N/A"])("rejects %j", (input) => {
    expect(parseLocaleNumber(input)).toBeNull();
  });
});

describe("Shopify handles", () => {
  it("accepts lowercase handles in any script", () => {
    for (const h of ["red-shirt", "t-shirt-2", "футболка", "シャツ", "商品-1", "café"]) {
      expect(isValidShopifyHandle(h)).toBe(true);
    }
  });

  it("rejects uppercase, spaces, and stray punctuation", () => {
    for (const h of ["Red-Shirt", "red shirt", "red_shirt", "-red", "red--shirt", "red/shirt"]) {
      expect(isValidShopifyHandle(h)).toBe(false);
    }
  });

  it("slugifies without destroying non-Latin text", () => {
    expect(slugifyShopifyHandle("Red Shirt & Hat")).toBe("red-shirt-and-hat");
    expect(slugifyShopifyHandle("Café Crème")).toBe("cafe-creme");
    expect(slugifyShopifyHandle("Men's Tee")).toBe("mens-tee");
    expect(slugifyShopifyHandle("Футболка Синяя")).toBe("футболка-синяя");
    expect(slugifyShopifyHandle("ギフト カード")).toBe("ギフト-カード");
    expect(slugifyShopifyHandle("  --  ")).toBe("");
  });
});

describe("canonicalizeShopifyProductCsv", () => {
  it("maps legacy export headers and keeps unknown columns", () => {
    const res = canonicalizeShopifyProductCsv(
      ["Handle", "Variant Taxable", "Variant Barcode", "Google Shopping / Google Product Category", "Collection"],
      [{ Handle: "a", "Variant Taxable": "FALSE", "Variant Barcode": "123", "Google Shopping / Google Product Category": "212", Collection: "Summer" }]
    );
    const row = res.fixedRows[0];
    expect(row["URL handle"]).toBe("a");
    expect(row["Charge tax"]).toBe("FALSE");
    expect(row["Barcode"]).toBe("123");
    expect(row["Google Shopping / Google product category"]).toBe("212");
    expect(row["Product category"]).toBe("");
    expect(res.unknownHeaders).toEqual(["Collection"]);
    expect(row["Collection"]).toBe("Summer");
  });

  it("converts legacy Variant Weight with its unit to grams", () => {
    const res = canonicalizeShopifyProductCsv(
      ["Handle", "Variant Weight", "Variant Weight Unit"],
      [{ Handle: "a", "Variant Weight": "1,5", "Variant Weight Unit": "kg" }]
    );
    expect(res.fixedRows[0]["Weight value (grams)"]).toBe("1500");
  });
});
