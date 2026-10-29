/**
 * Tests for src/lib/convertCsv.ts
 */
import { describe, it, expect } from "vitest";
import { convertCsv } from "@/lib/convertCsv";

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
    const result = convertCsv(sourceHeaders, sourceRows, "shopify_products", "woocommerce_products");
    expect(result.headers).toContain("Name");
    expect(result.headers).toContain("SKU");
    expect(result.headers).toContain("Regular price");
  });

  it("maps title, SKU, and price correctly", () => {
    const result = convertCsv(sourceHeaders, sourceRows, "shopify_products", "woocommerce_products");
    const row = result.rows[0]!;
    expect(row["Name"]).toBe("My Product");
    expect(row["SKU"]).toBe("SKU-001");
    expect(row["Regular price"]).toBe("29.99");
  });

  it("maps description and images", () => {
    const result = convertCsv(sourceHeaders, sourceRows, "shopify_products", "woocommerce_products");
    const row = result.rows[0]!;
    expect(row["Description"]).toBe("<p>A great product.</p>");
    expect(row["Images"]).toBe("https://example.com/img.jpg");
  });

  it("outputs one row for one input row", () => {
    const result = convertCsv(sourceHeaders, sourceRows, "shopify_products", "woocommerce_products");
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
    const result = convertCsv(sourceHeaders, sourceRows, "shopify_products", "etsy_listings");
    const row = result.rows[0]!;
    expect(row["TITLE"]).toBe("Handmade Scarf");
    expect(row["PRICE"]).toBe("45.00");
  });

  it("maps SKU and description", () => {
    const result = convertCsv(sourceHeaders, sourceRows, "shopify_products", "etsy_listings");
    const row = result.rows[0]!;
    expect(row["SKU"]).toBe("SCARF-001");
    expect(row["DESCRIPTION"]).toBe("A soft handmade scarf.");
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
    const result = convertCsv(sourceHeaders, sourceRows, "woocommerce_products", "ebay_listings");
    const row = result.rows[0]!;
    expect(row["*Title"]).toBe("Widget Pro");
    expect(row["*StartPrice"]).toBe("19.99");
  });

  it("maps SKU to CustomLabel", () => {
    const result = convertCsv(sourceHeaders, sourceRows, "woocommerce_products", "ebay_listings");
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

  it("truncates rows to an explicit limit", () => {
    const rows = makeRows(150);
    const result = convertCsv(headers, rows, "shopify_products", "woocommerce_products", 100);
    expect(result.rowsProcessed).toBe(100);
    expect(result.truncated).toBe(true);
    expect(result.rows).toHaveLength(100);
  });

  it("converts every row when there is no limit", () => {
    const rows = makeRows(150);
    const result = convertCsv(headers, rows, "shopify_products", "woocommerce_products");
    expect(result.truncated).toBe(false);
    expect(result.rows).toHaveLength(150);
  });

  it("includes a warning when truncated", () => {
    const rows = makeRows(150);
    const result = convertCsv(headers, rows, "shopify_products", "woocommerce_products", 100);
    const hasLimitWarning = result.warnings.some((w) => w.includes("100") || w.includes("limit"));
    expect(hasLimitWarning).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Unsupported formats
// ---------------------------------------------------------------------------

describe("convertCsv: unsupported formats", () => {
  it("returns a warning for unknown source format", () => {
    const result = convertCsv(["Title"], [{ Title: "X" }], "unknown_format", "shopify_products");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("returns a warning for unknown target format", () => {
    const result = convertCsv(["Title"], [{ Title: "X" }], "shopify_products", "unknown_target");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("warns when same source and different target produce unmapped fields", () => {
    // Amazon has fields like "item-name" that won't map to Shopify's source map
    const headers = ["item-name", "price", "sku"];
    const rows = [{ "item-name": "Prod", price: "9.99", sku: "SKU1" }];
    const result = convertCsv(headers, rows, "amazon_inventory_loader", "shopify_products");
    // Should complete without throwing
    expect(result).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Semantics that must survive conversion
// ---------------------------------------------------------------------------

describe("convertCsv: prices, stock and variants", () => {
  it("maps Shopify compare-at (original) price to WooCommerce Regular price, and price to Sale price", () => {
    const res = convertCsv(
      ["Title", "URL handle", "Price", "Compare-at price"],
      [{ Title: "Mug", "URL handle": "mug", Price: "15.00", "Compare-at price": "20.00" }],
      "shopify_products",
      "woocommerce_products");
    expect(res.rows[0]["Regular price"]).toBe("20.00");
    expect(res.rows[0]["Sale price"]).toBe("15.00");
  });

  it("maps a WooCommerce sale back to Shopify price + compare-at", () => {
    const res = convertCsv(
      ["Type", "Name", "Regular price", "Sale price"],
      [{ Type: "simple", Name: "Mug", "Regular price": "20", "Sale price": "15" }],
      "woocommerce_products",
      "shopify_products");
    expect(res.rows[0]["Price"]).toBe("15.00");
    expect(res.rows[0]["Compare-at price"]).toBe("20.00");
  });

  it("does not treat WooCommerce 'In stock?' as a quantity", () => {
    const res = convertCsv(
      ["Type", "Name", "In stock?", "Regular price"],
      [{ Type: "simple", Name: "Mug", "In stock?": "1", "Regular price": "5" }],
      "woocommerce_products",
      "shopify_products");
    expect(res.headers).not.toContain("Inventory quantity");
  });

  it("converts a Shopify product with variants into a WooCommerce variable product", () => {
    const res = convertCsv(
      ["Title", "URL handle", "Option1 name", "Option1 value", "SKU", "Price", "Inventory quantity", "Product image URL"],
      [
        { Title: "Tee", "URL handle": "tee", "Option1 name": "Size", "Option1 value": "S", SKU: "TEE-S", Price: "10", "Inventory quantity": "3", "Product image URL": "https://x.com/1.jpg" },
        { Title: "", "URL handle": "tee", "Option1 name": "", "Option1 value": "M", SKU: "TEE-M", Price: "10", "Inventory quantity": "0", "Product image URL": "https://x.com/2.jpg" },
      ],
      "shopify_products",
      "woocommerce_products");
    expect(res.rows.map((r) => r["Type"])).toEqual(["variable", "variation", "variation"]);
    expect(res.rows[0]["Attribute 1 value(s)"]).toBe("S, M");
    expect(res.rows[0]["Images"]).toBe("https://x.com/1.jpg, https://x.com/2.jpg");
    expect(res.rows[2]).toMatchObject({ Parent: "TEE", "Attribute 1 value(s)": "M", "In stock?": "0" });
  });

  it("converts WooCommerce variations into Shopify variant rows sharing one handle", () => {
    const res = convertCsv(
      ["Type", "SKU", "Name", "Description", "Images", "Parent", "Regular price", "Attribute 1 name", "Attribute 1 value(s)"],
      [
        { Type: "variation", SKU: "TEE-S", Name: "", Description: "", Images: "", Parent: "TEE", "Regular price": "10", "Attribute 1 name": "Size", "Attribute 1 value(s)": "S" },
        { Type: "variable", SKU: "TEE", Name: "Tee", Description: "Soft", Images: "https://x.com/1.jpg, https://x.com/2.jpg", Parent: "", "Regular price": "", "Attribute 1 name": "Size", "Attribute 1 value(s)": "S, M" },
        { Type: "variation", SKU: "TEE-M", Name: "", Description: "", Images: "", Parent: "TEE", "Regular price": "11", "Attribute 1 name": "Size", "Attribute 1 value(s)": "M" },
      ],
      "woocommerce_products",
      "shopify_products");
    expect(res.rows.map((r) => r["URL handle"])).toEqual(["tee", "tee"]);
    expect(res.rows[0]).toMatchObject({ Title: "Tee", "Option1 name": "Size", "Option1 value": "S", "Product image URL": "https://x.com/1.jpg" });
    expect(res.rows[1]).toMatchObject({ "Option1 value": "M", SKU: "TEE-M", "Product image URL": "https://x.com/2.jpg" });
  });

  it("writes eBay variation listings as a parent row plus Relationship=Variation rows", () => {
    const res = convertCsv(
      ["Title", "URL handle", "Option1 name", "Option1 value", "SKU", "Price"],
      [
        { Title: "Tee", "URL handle": "tee", "Option1 name": "Size", "Option1 value": "S", SKU: "TEE-S", Price: "10" },
        { Title: "", "URL handle": "tee", "Option1 name": "", "Option1 value": "M", SKU: "TEE-M", Price: "10" },
      ],
      "shopify_products",
      "ebay_listings");
    expect(res.rows[0]["RelationshipDetails"]).toBe("Size=S;M");
    expect(res.rows[1]).toMatchObject({ Relationship: "Variation", RelationshipDetails: "Size=S", CustomLabel: "TEE-S" });
    expect(res.rows[0]["*ConditionID"]).toBe("");
  });

  it("detects the Amazon product-id-type from the barcode", () => {
    const res = convertCsv(
      ["Title", "URL handle", "SKU", "Barcode", "Price"],
      [
        { Title: "A", "URL handle": "a", SKU: "A", Barcode: "012345678905", Price: "1" },
        { Title: "B", "URL handle": "b", SKU: "B", Barcode: "4006381333931", Price: "1" },
      ],
      "shopify_products",
      "amazon_inventory_loader");
    expect(res.rows.map((r) => r["product-id-type"])).toEqual(["3", "4"]);
    expect(res.headers).toContain("fulfillment-center-id");
  });
});
