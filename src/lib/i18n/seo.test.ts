import { describe, expect, it } from "vitest";
import { fitDescription, fitTitle, fitTitleString, textWidth } from "./seo";

describe("fitTitle", () => {
  it("keeps every part when the title fits", () => {
    expect(fitTitle("Missing title", "Shopify CSV Guide")).toBe("Missing title | Shopify CSV Guide | StriveFormats");
  });
  it("drops extras, then the brand, but never the main title", () => {
    expect(fitTitle("Product with images but no variant row", "Shopify CSV Guide")).toBe("Product with images but no variant row | Shopify CSV Guide");
    expect(fitTitle("Variantes de produit Shopify : structure CSV et erreurs courantes", "Guide CSV Shopify")).toBe("Variantes de produit Shopify | Guide CSV Shopify");
    expect(fitTitle("Les variantes de produit Shopify expliquées : structure CSV et erreurs courantes")).toBe("Les variantes de produit Shopify expliquées | StriveFormats");
    const long = "Verhindern, dass Excel SKUs und Barcodes in wissenschaftliche Schreibweise umwandelt";
    expect(fitTitle(long, "Allgemeine CSV-Anleitung")).toBe(long);
  });
  it("keeps the topic of a long \"topic: details\" title", () => {
    expect(fitTitle("Campos de sí/no en los archivos planos de Amazon: true/false, y/n y errores comunes")).toBe(
      "Campos de sí/no en los archivos planos de Amazon",
    );
  });
  it("counts CJK characters double", () => {
    expect(textWidth("标签过多")).toBe(8);
    expect(textWidth(fitTitle("CSV ファイルの重複したヘッダー行を削除する", "Shopify CSV ガイド"))).toBeLessThanOrEqual(60);
  });
});

describe("fitTitleString", () => {
  it("keeps the message before the brand", () => {
    expect(fitTitleString("Shopify CSV Fixer | Fix Shopify Product CSV Import Errors | StriveFormats")).toBe("Shopify CSV Fixer | Fix Shopify Product CSV Import Errors");
  });
  it("moves a leading brand to the end", () => {
    expect(fitTitleString("StriveFormats | Fix Shopify & Ecommerce CSV Import Errors")).toBe("Fix Shopify & Ecommerce CSV Import Errors | StriveFormats");
  });
});

describe("fitDescription", () => {
  it("leaves short text alone", () => {
    expect(fitDescription("Fix it fast.")).toBe("Fix it fast.");
  });
  it("cuts at a sentence end when one is close to the limit", () => {
    const d = "Check a Shopify product CSV against the official template before you import. Prices, handles and true/false values are fixed automatically; variant problems are pinned to the exact row.";
    expect(fitDescription(d)).toBe("Check a Shopify product CSV against the official template before you import.");
  });
  it("otherwise cuts at a word with an ellipsis", () => {
    const d = "word ".repeat(60).trim();
    const out = fitDescription(d);
    expect(out.endsWith("word…")).toBe(true);
    expect(textWidth(out)).toBeLessThanOrEqual(155);
  });
  it("handles CJK text without spaces", () => {
    const out = fitDescription("这是一个很长的描述".repeat(20));
    expect(textWidth(out)).toBeLessThanOrEqual(155);
    expect(out.endsWith("…")).toBe(true);
  });
});
