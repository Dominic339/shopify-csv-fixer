// src/lib/formats/builtins/shopifyProducts.ts
import type { CsvFormat } from "../types";
import type { CsvRow } from "@/lib/csv";
import { validateAndFixShopifyOptimizer } from "@/lib/shopifyOptimizer";
import { getStrictMode } from "@/lib/validation/strictMode";

// Shopify's current official product template headers (matches public/samples/shopify_product_template.csv)
// Exported so tests can assert header parity without duplicating the list.
export const SHOPIFY_PRODUCT_TEMPLATE_HEADERS: string[] = [
  "Title",
  "URL handle",
  "Description",
  "Vendor",
  "Product category",
  "Type",
  "Tags",
  "Published on online store",
  "Status",
  "SKU",
  "Barcode",
  "Option1 name",
  "Option1 value",
  "Option1 Linked To",
  "Option2 name",
  "Option2 value",
  "Option2 Linked To",
  "Option3 name",
  "Option3 value",
  "Option3 Linked To",
  "Price",
  "Compare-at price",
  "Cost per item",
  "Charge tax",
  "Tax code",
  "Unit price total measure",
  "Unit price total measure unit",
  "Unit price base measure",
  "Unit price base measure unit",
  "Inventory tracker",
  "Inventory quantity",
  "Continue selling when out of stock",
  "Weight value (grams)",
  "Weight unit for display",
  "Requires shipping",
  "Fulfillment service",
  "Product image URL",
  "Image position",
  "Image alt text",
  "Variant image URL",
  "Gift card",
  "SEO title",
  "SEO description",
  "Color (product.metafields.shopify.color-pattern)",
  "Google Shopping / Google product category",
  "Google Shopping / Gender",
  "Google Shopping / Age group",
  "Google Shopping / Manufacturer part number (MPN)",
  "Google Shopping / Ad group name",
  "Google Shopping / Ads labels",
  "Google Shopping / Condition",
  "Google Shopping / Custom product",
  "Google Shopping / Custom label 0",
  "Google Shopping / Custom label 1",
  "Google Shopping / Custom label 2",
  "Google Shopping / Custom label 3",
  "Google Shopping / Custom label 4",
];

export const shopifyProductsFormat: CsvFormat = {
  id: "shopify_products",
  name: "Shopify Import Optimizer",
  description:
    "Strict Shopify schema validation + safe auto-fixes for products, variants, pricing, inventory, images, and SEO.",
  category: "Ecommerce",
  source: "builtin",

  expectedHeaders: SHOPIFY_PRODUCT_TEMPLATE_HEADERS,
  exampleRow: {
    "Title": "Sample Product",
    "URL handle": "sample-product",
    "Description": "A short description for your product.",
    "Vendor": "Your Brand",
    "Product category": "Apparel & Accessories > Clothing",
    "Type": "T-Shirt",
    "Tags": "sample, tshirt, cotton",
    "Published on online store": "TRUE",
    "Status": "active",
    "SKU": "SKU-1001",
    "Barcode": "",
    "Option1 name": "Title",
    "Option1 value": "Default Title",
    "Option1 Linked To": "",
    "Option2 name": "",
    "Option2 value": "",
    "Option2 Linked To": "",
    "Option3 name": "",
    "Option3 value": "",
    "Option3 Linked To": "",
    "Price": "19.99",
    "Compare-at price": "29.99",
    "Cost per item": "7.50",
    "Charge tax": "TRUE",
    "Tax code": "",
    "Unit price total measure": "",
    "Unit price total measure unit": "",
    "Unit price base measure": "",
    "Unit price base measure unit": "",
    "Inventory tracker": "shopify",
    "Inventory quantity": "10",
    "Continue selling when out of stock": "FALSE",
    "Weight value (grams)": "200",
    "Weight unit for display": "g",
    "Requires shipping": "TRUE",
    "Fulfillment service": "manual",
    "Product image URL": "https://example.com/image.jpg",
    "Image position": "1",
    "Image alt text": "Sample Product",
    "Variant image URL": "",
    "Gift card": "FALSE",
    "SEO title": "Sample Product",
    "SEO description": "Example SEO description used for testing.",
    "Color (product.metafields.shopify.color-pattern)": "",
    "Google Shopping / Google product category": "",
    "Google Shopping / Gender": "",
    "Google Shopping / Age group": "",
    "Google Shopping / Manufacturer part number (MPN)": "",
    "Google Shopping / Ad group name": "",
    "Google Shopping / Ads labels": "",
    "Google Shopping / Condition": "new",
    "Google Shopping / Custom product": "FALSE",
    "Google Shopping / Custom label 0": "",
    "Google Shopping / Custom label 1": "",
    "Google Shopping / Custom label 2": "",
    "Google Shopping / Custom label 3": "",
    "Google Shopping / Custom label 4": "",
  },
  seo: {
    longDescription: [
      "Shopify product imports are picky: a single malformed price, a missing option value, or an image row in the wrong place can cause a full import to fail.",
      "This preset validates your CSV against Shopify’s official template and applies safe auto fixes so you can upload with confidence. You keep full control of your data: every fix is logged, and the exported CSV remains Shopify import ready.",
    ],
    howItWorks: [
      "Upload your Shopify CSV export or the official template.",
      "We canonicalize headers, normalize common formats (booleans, money, inventory values), and validate required fields.",
      "Auto fix safe issues (like trimming whitespace, standardizing TRUE/FALSE, normalizing price fields) and flag risky issues for review.",
      "Export a clean CSV that matches Shopify’s expected schema.",
    ],
    commonFixes: [
      "Standardize booleans (TRUE/FALSE) and status values (active/draft/archived).",
      "Normalize money fields (Price, Compare-at price, Cost per item) and remove stray currency symbols.",
      "Detect duplicate SKUs and variant collisions that break imports.",
      "Validate option structure (Option1/2/3 name/value) and flag incomplete variant rows.",
      "Validate image rows (Product image URL, Image position) and flag missing/invalid URLs.",
      "Trim and normalize whitespace, tags, and handle formatting for consistency.",
    ],
    faq: [
      {
        q: "Will this change my product data?",
        a: "Only safe, reversible formatting fixes are applied automatically (for example trimming whitespace or normalizing TRUE/FALSE). Risky items are flagged so you can decide before exporting.",
      },
      {
        q: "Does it work with exports from other apps?",
        a: "Yes. Many Shopify apps add extra columns. StriveFormats preserves unknown columns and focuses on making the Shopify required fields import ready.",
      },
      {
        q: "Can I use the official Shopify template?",
        a: "Yes. You can download the official template sample on this page and upload it directly in the fixer.",
      },
    ],
  },

  apply: (headers: string[], rows: CsvRow[]) => {
    // Read strict mode preference from localStorage (false in SSR / Node test environments)
    const strict = getStrictMode();
    const res = validateAndFixShopifyOptimizer(headers ?? [], rows ?? [], { strict });

    const issues = (res.issues ?? []).map((i: any) => {
      const row1 =
        typeof i.row === "number"
          ? i.row
          : typeof i.rowIndex === "number"
            ? i.rowIndex + 1
            : undefined;

      const rowIndex = typeof row1 === "number" ? Math.max(0, row1 - 1) : -1;

      return {
        rowIndex, // -1 = file-level
        column: i.column ?? "(file)",
        message: i.message,
        severity: (i.severity ?? i.level ?? "error") as "error" | "warning" | "info",
        code: i.code,
        suggestion: i.suggestion,
      };
    });

    return {
      fixedHeaders: res.fixedHeaders ?? (headers ?? []),
      fixedRows: res.fixedRows ?? (rows ?? []),
      issues,
      fixesApplied: res.fixesApplied ?? [],
    };
  },
};
