// src/lib/presets.ts
// Presets power SEO pages (/presets/[id]) and sample downloads (/presets/[id]/sample.csv).
// Ecommerce-first scope (initial release): Shopify, WooCommerce, Amazon, eBay, Etsy.

export type PresetCategory = "Ecommerce";

export type PresetFormat = {
  // Used for /presets/[id]
  id: string;

  // Display
  name: string;
  description: string;
  category: PresetCategory;

  // Must match the CsvFormat id used by your validation engine (/app?preset=...)
  formatId: string;

  // Columns used for template preview tables (and for non-Shopify sample generation)
  columns: string[];

  // Rows used to generate sample CSV downloads for non-Shopify presets
  sampleRows: Record<string, string>[];
};

// Shopify official template-aligned headers (also mirrored in src/lib/formats/engine.ts)
const SHOPIFY_PRODUCTS_COLUMNS: string[] = [
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
  "Product image",
  "Image position",
  "Image alt text",
  "Variant image",
  "Variant weight",
  "Variant weight unit",
  "Variant tax code",
  "Variant barcode",
  "Gift card",
  "SEO title",
  "SEO description",
  "Google Shopping / Google product category",
  "Google Shopping / Gender",
  "Google Shopping / Age group",
  "Google Shopping / MPN",
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

export const PRESET_FORMATS: PresetFormat[] = [
  {
    id: "shopify_products",
    name: "Shopify Products CSV",
    category: "Ecommerce",
    formatId: "shopify_products",
    description:
      "Official template-aligned Shopify Products import. StriveFormats applies safe auto-fixes (headers, booleans, numbers, variant grouping sanity checks, URL checks) and flags risky issues for review.",
    columns: SHOPIFY_PRODUCTS_COLUMNS,
    // Sample download is served from /public/templates/shopify_product_template.csv, but we keep rows for preview tables.
    sampleRows: [
      {
        Title: "Sample Product",
        "URL handle": "sample-product",
        Description: "A sample product description.",
        Vendor: "Sample Vendor",
        "Product category": "",
        Type: "Sample Type",
        Tags: "tag1,tag2",
        "Published on online store": "TRUE",
        Status: "active",
        SKU: "SKU-SAMPLE-001",
        Barcode: "",
        "Option1 name": "Size",
        "Option1 value": "M",
        "Option1 Linked To": "",
        "Option2 name": "Color",
        "Option2 value": "Black",
        "Option2 Linked To": "",
        "Option3 name": "",
        "Option3 value": "",
        "Option3 Linked To": "",
        Price: "19.99",
        "Compare-at price": "",
        "Cost per item": "",
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
        "Product image": "https://example.com/product.jpg",
        "Image position": "1",
        "Image alt text": "Sample product image",
        "Variant image": "https://example.com/variant.jpg",
        "Variant weight": "",
        "Variant weight unit": "",
        "Variant tax code": "",
        "Variant barcode": "",
        "Gift card": "FALSE",
        "SEO title": "Sample Product",
        "SEO description": "Sample SEO description.",
        "Google Shopping / Google product category": "",
        "Google Shopping / Gender": "",
        "Google Shopping / Age group": "",
        "Google Shopping / MPN": "",
        "Google Shopping / Ad group name": "",
        "Google Shopping / Ads labels": "",
        "Google Shopping / Condition": "",
        "Google Shopping / Custom product": "",
        "Google Shopping / Custom label 0": "",
        "Google Shopping / Custom label 1": "",
        "Google Shopping / Custom label 2": "",
        "Google Shopping / Custom label 3": "",
        "Google Shopping / Custom label 4": "",
      },
    ],
  },
  {
    id: "woocommerce_products",
    name: "WooCommerce Products CSV",
    category: "Ecommerce",
    formatId: "woocommerce_products",
    description:
      "WooCommerce products import/export helper. StriveFormats normalizes headers, trims whitespace, standardizes numeric fields, and flags missing essentials before import.",
    columns: [
      "ID",
      "Type",
      "SKU",
      "Name",
      "Published",
      "Is featured?",
      "Visibility in catalog",
      "Short description",
      "Description",
      "Regular price",
      "Sale price",
      "Categories",
      "Tags",
      "Images",
    ],
    sampleRows: [
      {
        ID: "",
        Type: "simple",
        SKU: "WOO-SKU-001",
        Name: "Woo Sample Product",
        Published: "1",
        "Is featured?": "0",
        "Visibility in catalog": "visible",
        "Short description": "Short description here.",
        Description: "Long description here.",
        "Regular price": "29.99",
        "Sale price": "",
        Categories: "Category A",
        Tags: "tag1,tag2",
        Images: "https://example.com/image1.jpg",
      },
    ],
  },
  {
    id: "amazon_inventory_loader",
    name: "Amazon Inventory Loader (Simplified)",
    category: "Ecommerce",
    formatId: "amazon_inventory_loader",
    description:
      "Simplified inventory-loader style template for Amazon Seller Central. Focuses on safe formatting checks for identifiers and numeric fields.",
    columns: ["sku", "product-id", "product-id-type", "price", "quantity", "item-name", "brand-name"],
    sampleRows: [
      {
        sku: "AMZ-SKU-001",
        "product-id": "012345678905",
        "product-id-type": "UPC",
        price: "19.99",
        quantity: "25",
        "item-name": "Amazon Sample Item",
        "brand-name": "Sample Brand",
      },
    ],
  },
  {
    id: "amazon_product_template",
    name: "Amazon Product Template (Minimal)",
    category: "Ecommerce",
    formatId: "amazon_product_template",
    description:
      "Minimal product template starter for Amazon Seller Central. Keeps scope intentionally safe: core attributes, identifiers, and basic numeric validation.",
    columns: [
      "sku",
      "item-name",
      "brand-name",
      "manufacturer",
      "product-id",
      "product-id-type",
      "description",
      "price",
      "quantity",
      "main-image-url",
    ],
    sampleRows: [
      {
        sku: "AMZ-PROD-001",
        "item-name": "Amazon Product Template Item",
        "brand-name": "Sample Brand",
        manufacturer: "Sample Manufacturer",
        "product-id": "012345678905",
        "product-id-type": "UPC",
        description: "A basic product description.",
        price: "24.99",
        quantity: "10",
        "main-image-url": "https://example.com/image.jpg",
      },
    ],
  },
  {
    id: "ebay_listings",
    name: "eBay Listings (Basic)",
    category: "Ecommerce",
    formatId: "ebay_listings",
    description:
      "Simplified eBay listings template. StriveFormats trims whitespace, standardizes numbers, validates required fields, and flags invalid URLs.",
    columns: ["Title", "SKU", "Quantity", "Price", "ConditionID", "CategoryID", "PictureURL"],
    sampleRows: [
      {
        Title: "eBay Sample Listing",
        SKU: "EBAY-SKU-001",
        Quantity: "5",
        Price: "14.99",
        ConditionID: "1000",
        CategoryID: "1234",
        PictureURL: "https://example.com/image.jpg",
      },
    ],
  },
  {
    id: "ebay_variations",
    name: "eBay Variations Template",
    category: "Ecommerce",
    formatId: "ebay_variations",
    description:
      "Variation-friendly template that helps keep parent/child rows consistent. Safe checks only: required fields, numeric formatting, and basic URL validation.",
    columns: ["ParentSKU", "SKU", "Title", "VariationName", "VariationValue", "Quantity", "Price", "PictureURL"],
    sampleRows: [
      {
        ParentSKU: "EBAY-PARENT-001",
        SKU: "EBAY-CHILD-001",
        Title: "eBay Variation Listing",
        VariationName: "Size",
        VariationValue: "M",
        Quantity: "3",
        Price: "17.99",
        PictureURL: "https://example.com/image.jpg",
      },
    ],
  },
  {
    id: "etsy_listings",
    name: "Etsy Listings CSV",
    category: "Ecommerce",
    formatId: "etsy_listings",
    description:
      "Simplified Etsy listing template. StriveFormats standardizes numeric formatting, flags missing required fields, and helps keep output consistent.",
    columns: ["Title", "Description", "Price", "Quantity", "SKU", "Tags", "Who made it", "When was it made", "What is it"],
    sampleRows: [
      {
        Title: "Etsy Sample Listing",
        Description: "Handmade item description.",
        Price: "32.00",
        Quantity: "7",
        SKU: "ETSY-SKU-001",
        Tags: "handmade,etsy",
        "Who made it": "i_did",
        "When was it made": "made_to_order",
        "What is it": "physical",
      },
    ],
  },
];

export function getPresetById(id: string): PresetFormat | undefined {
  const needle = (id ?? "").trim().toLowerCase();
  return PRESET_FORMATS.find((p) => p.id.toLowerCase() === needle);
}

export function getPresetFormats(): PresetFormat[] {
  return PRESET_FORMATS.slice();
}

export function groupPresetsByCategory(): Record<PresetCategory, PresetFormat[]> {
  return {
    Ecommerce: PRESET_FORMATS.slice(),
  };
}
