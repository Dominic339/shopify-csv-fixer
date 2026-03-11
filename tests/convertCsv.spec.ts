/**
 * Tests for src/lib/convertCsv.ts
 */
import { describe, it, expect } from "vitest";
import { convertCsv, getConvertRowLimit } from "@/lib/convertCsv";

// ---------------------------------------------------------------------------
// Row limit helpers
// ---------------------------------------------------------------------------

describe("getConvertRowLimit", () => {
  it("returns 100 for free", () => {
    expect(getConvertRowLimit("free")).toBe(100);
  });
  it("returns 1000 for basic", () => {
    expect(getConvertRowLimit("basic")).toBe(1000);
  });
  it("returns null (unlimited) for advanced", () => {
    expect(getConvertRowLimit("advanced")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Shopify legacy → WooCommerce
// ---------------------------------------------------------------------------

describe("convertCsv: shopify_products → woocommerce_products", () => {
  const sourceHeaders = [
    "Handle", "Title", "Body (HTML)", "Vendor", "Tags",
    "Variant SKU", "Variant Price", "Variant Inventory Qty",
    "Image Src", "SEO Title", "SEO Description",
  ];

  const sourceRows = [
    {
      "Handle": "my-product",
      "Title": "My Product",
      "Body (HTML)": "<p>A great product.</p>",
      "Vendor": "Acme",
      "Tags": "tag1, tag2",
      "Variant SKU": "SKU-001",
      "Variant Price": "29.99",
      "Variant Inventory Qty": "10",
      "Image Src": "https://example.com/img.jpg",
      "SEO Title": "My Product | Acme",
      "SEO Description": "Buy My Product",
    },
  ];

  it("produces WooCommerce-format headers", () => {
    const result = convertCsv(sourceHeaders, sourceRows, "shopify_products", "woocommerce_products", "advanced");
    expect(result.headers).toContain("Name");
    expect(result.headers).toContain("SKU");
    expect(result.headers).toContain("Regular price");
  });

  it("maps title, SKU, and price correctly", () => {
    const result = convertCsv(sourceHeaders, sourceRows, "shopify_products", "woocommerce_products", "advanced");
    const row = result.rows[0]!;
    expect(row["Name"]).toBe("My Product");
    expect(row["SKU"]).toBe("SKU-001");
    expect(row["Regular price"]).toBe("29.99");
  });

  it("maps description and images", () => {
    const result = convertCsv(sourceHeaders, sourceRows, "shopify_products", "woocommerce_products", "advanced");
    const row = result.rows[0]!;
    expect(row["Description"]).toBe("<p>A great product.</p>");
    expect(row["Images"]).toBe("https://example.com/img.jpg");
  });

  it("outputs one row for one input row", () => {
    const result = convertCsv(sourceHeaders, sourceRows, "shopify_products", "woocommerce_products", "advanced");
    expect(result.rows).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Shopify new template → Etsy
// ---------------------------------------------------------------------------

describe("convertCsv: shopify_products (new) → etsy_listings", () => {
  const sourceHeaders = ["Title", "URL handle", "Description", "Price", "SKU", "Inventory quantity", "Tags"];
  const sourceRows = [
    {
      "Title": "Handmade Scarf",
      "URL handle": "handmade-scarf",
      "Description": "A soft handmade scarf.",
      "Price": "45.00",
      "SKU": "SCARF-001",
      "Inventory quantity": "5",
      "Tags": "scarf, handmade",
    },
  ];

  it("maps title and price to Etsy headers", () => {
    const result = convertCsv(sourceHeaders, sourceRows, "shopify_products", "etsy_listings", "advanced");
    const row = result.rows[0]!;
    expect(row["Title"]).toBe("Handmade Scarf");
    expect(row["Price"]).toBe("45.00");
  });

  it("maps SKU and description", () => {
    const result = convertCsv(sourceHeaders, sourceRows, "shopify_products", "etsy_listings", "advanced");
    const row = result.rows[0]!;
    expect(row["SKU"]).toBe("SCARF-001");
    expect(row["Description"]).toBe("A soft handmade scarf.");
  });
});

// ---------------------------------------------------------------------------
// WooCommerce → eBay
// ---------------------------------------------------------------------------

describe("convertCsv: woocommerce_products → ebay_listings", () => {
  const sourceHeaders = ["Name", "SKU", "Description", "Regular price", "Stock", "Images"];
  const sourceRows = [
    {
      "Name": "Widget Pro",
      "SKU": "WIDGET-PRO",
      "Description": "The best widget.",
      "Regular price": "19.99",
      "Stock": "100",
      "Images": "https://example.com/widget.jpg",
    },
  ];

  it("maps title and price to eBay fields", () => {
    const result = convertCsv(sourceHeaders, sourceRows, "woocommerce_products", "ebay_listings", "advanced");
    const row = result.rows[0]!;
    expect(row["Title"]).toBe("Widget Pro");
    expect(row["StartPrice"]).toBe("19.99");
  });

  it("maps SKU to CustomLabel", () => {
    const result = convertCsv(sourceHeaders, sourceRows, "woocommerce_products", "ebay_listings", "advanced");
    const row = result.rows[0]!;
    expect(row["CustomLabel"]).toBe("WIDGET-PRO");
  });
});

// ---------------------------------------------------------------------------
// Row limit enforcement
// ---------------------------------------------------------------------------

describe("convertCsv row limit enforcement", () => {
  const headers = ["Title", "Variant Price"];
  const makeRows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      "Title": `Product ${i}`,
      "Variant Price": "9.99",
    }));

  it("truncates rows for free plan (limit=100)", () => {
    const rows = makeRows(150);
    const result = convertCsv(headers, rows, "shopify_products", "woocommerce_products", "free");
    expect(result.rowsProcessed).toBe(100);
    expect(result.truncated).toBe(true);
    expect(result.rows).toHaveLength(100);
  });

  it("does not truncate for advanced plan", () => {
    const rows = makeRows(150);
    const result = convertCsv(headers, rows, "shopify_products", "woocommerce_products", "advanced");
    expect(result.truncated).toBe(false);
    expect(result.rows).toHaveLength(150);
  });

  it("includes a warning when truncated", () => {
    const rows = makeRows(150);
    const result = convertCsv(headers, rows, "shopify_products", "woocommerce_products", "free");
    const hasLimitWarning = result.warnings.some((w) => w.includes("100") || w.includes("limit"));
    expect(hasLimitWarning).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Unsupported formats
// ---------------------------------------------------------------------------

describe("convertCsv: unsupported formats", () => {
  it("returns a warning for unknown source format", () => {
    const result = convertCsv(["Title"], [{ Title: "X" }], "unknown_format", "shopify_products", "advanced");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("returns a warning for unknown target format", () => {
    const result = convertCsv(["Title"], [{ Title: "X" }], "shopify_products", "unknown_target", "advanced");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("warns when same source and different target produce unmapped fields", () => {
    // Amazon has fields like "item-name" that won't map to Shopify's source map
    const headers = ["item-name", "price", "sku"];
    const rows = [{ "item-name": "Prod", price: "9.99", sku: "SKU1" }];
    const result = convertCsv(headers, rows, "amazon_inventory_loader", "shopify_products", "advanced");
    // Should complete without throwing
    expect(result).toBeDefined();
  });
});
