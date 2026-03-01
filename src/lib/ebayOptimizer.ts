// src/lib/ebayOptimizer.ts

import type { CsvFixResult, CsvIssue, CsvRow } from "@/lib/formats/types";
import { normalizeRowsSafe } from "@/lib/formats/engine";
import { isHttpUrl, parseShopifyMoney, formatShopifyMoney } from "@/lib/shopifySchema";

// eBay File Exchange canonical listing headers.
export const EBAY_LISTING_EXPECTED_HEADERS = [
  "Action",
  "CustomLabel",
  "Title",
  "Description",
  "StartPrice",
  "Quantity",
  "Format",
  "Duration",
  "ConditionID",
  "ConditionDescription",
  "CategoryID",
  "PictureURL",
  "Category2Name",
  "DispatchTimeMax",
  "ShippingProfileName",
  "PaymentProfileName",
  "ReturnsProfileName",
];

export const EBAY_LISTING_EXAMPLE_ROW: CsvRow = {
  Action: "Add",
  CustomLabel: "SKU-12345",
  Title: "Example Item Title for eBay Listing",
  Description: "Full description of the item including condition details.",
  StartPrice: "24.99",
  Quantity: "10",
  Format: "FixedPriceItem",
  Duration: "GTC",
  ConditionID: "1000",
  ConditionDescription: "",
  CategoryID: "9355",
  PictureURL: "https://example.com/images/item.jpg",
  Category2Name: "Electronics",
  DispatchTimeMax: "3",
  ShippingProfileName: "Standard Shipping",
  PaymentProfileName: "eBay Managed Payments",
  ReturnsProfileName: "30-Day Returns",
};

// eBay Variation format (for listings with variants like size/color).
export const EBAY_VARIATION_EXPECTED_HEADERS = [
  "Action",
  "CustomLabel",
  "Title",
  "StartPrice",
  "Quantity",
  "VariationSpecificsName",
  "VariationSpecificsValue",
  "VariationPictureName",
  "VariationPictureURL",
];

export const EBAY_VARIATION_EXAMPLE_ROW: CsvRow = {
  Action: "Add",
  CustomLabel: "SKU-12345-BLU-M",
  Title: "Example T-Shirt",
  StartPrice: "24.99",
  Quantity: "5",
  VariationSpecificsName: "Color|Size",
  VariationSpecificsValue: "Blue|Medium",
  VariationPictureName: "Color",
  VariationPictureURL: "https://example.com/images/blue.jpg",
};

const VALID_ACTIONS = new Set(["add", "revise", "delete", "end"]);
const VALID_FORMATS = new Set(["fixedpriceitem", "chinese"]);

// Standard eBay ConditionIDs accepted across most categories.
const VALID_CONDITION_IDS = new Set([
  "1000", // New
  "1500", // New other (see details)
  "1750", // New with defects
  "2000", // Manufacturer refurbished
  "2010", // Seller refurbished
  "2500", // Like New
  "2750", // Very Good
  "3000", // Good
  "4000", // Acceptable
  "5000", // For parts or not working
  "6000", // Pre-owned
  "7000", // Used
]);

const VALID_DURATIONS = /^(GTC|Days_[0-9]+)$/i;

function isEmpty(v: string) {
  return !String(v ?? "").trim();
}

function parseIntSafe(v: string) {
  if (!String(v ?? "").trim()) return { ok: true, value: "" };
  const n = Number.parseInt(String(v).trim(), 10);
  if (!Number.isFinite(n) || n < 0) return { ok: false, value: v };
  return { ok: true, value: String(n) };
}

function canonicalEbayListingHeaders(inputHeaders: string[]): string[] {
  const lowerToCanon = new Map(EBAY_LISTING_EXPECTED_HEADERS.map((h) => [h.toLowerCase(), h] as const));

  // eBay File Exchange action header can carry metadata in parentheses; handle both
  // asterisk-prefixed required fields and common synonym names.
  const synonyms: Record<string, string> = {
    // Action column comes with metadata in asterisk format
    "*action": "Action",
    "*action (siteid=us|country=us|currency=usd|version=1193|cc=utf-8)": "Action",
    // Title
    "*title": "Title",
    "*title (required)": "Title",
    // Price
    "*startprice": "StartPrice",
    price: "StartPrice",
    buynowprice: "StartPrice",
    "buy it now price": "StartPrice",
    // SKU / Custom Label
    "*customlabel": "CustomLabel",
    sku: "CustomLabel",
    seller_sku: "CustomLabel",
    "custom label": "CustomLabel",
    // Quantity
    "*quantity": "Quantity",
    qty: "Quantity",
    // CategoryID (numeric eBay category)
    "*categoryid": "CategoryID",
    "category id": "CategoryID",
    // Category2Name (human-readable category name)
    "*category2name": "Category2Name",
    category: "Category2Name",
    "category name": "Category2Name",
    // Images
    "*pictureurl": "PictureURL",
    pictures: "PictureURL",
    imageurl: "PictureURL",
    "image url": "PictureURL",
    // Condition
    "*conditionid": "ConditionID",
    condition: "ConditionID",
    item_condition: "ConditionID",
    "item condition": "ConditionID",
    // Duration
    "*duration": "Duration",
    listing_duration: "Duration",
    "listing duration": "Duration",
    // Format
    "*format": "Format",
    listing_type: "Format",
    "listing type": "Format",
    // Dispatch
    "*dispatchtimemax": "DispatchTimeMax",
    handling_time: "DispatchTimeMax",
    "handling time": "DispatchTimeMax",
    "dispatch time max": "DispatchTimeMax",
    // Profile names
    "*shippingprofilename": "ShippingProfileName",
    "shipping profile name": "ShippingProfileName",
    "*paymentprofilename": "PaymentProfileName",
    "payment profile name": "PaymentProfileName",
    "*returnsprofilename": "ReturnsProfileName",
    "returns profile name": "ReturnsProfileName",
  };

  return inputHeaders.map((h) => {
    const key = h.trim().toLowerCase();
    return lowerToCanon.get(key) ?? synonyms[key] ?? h.trim();
  });
}

function canonicalEbayVariationHeaders(inputHeaders: string[]): string[] {
  const lowerToCanon = new Map(EBAY_VARIATION_EXPECTED_HEADERS.map((h) => [h.toLowerCase(), h] as const));

  const synonyms: Record<string, string> = {
    "*action": "Action",
    "*title": "Title",
    "*title (required)": "Title",
    "*startprice": "StartPrice",
    price: "StartPrice",
    "*customlabel": "CustomLabel",
    sku: "CustomLabel",
    "*quantity": "Quantity",
    qty: "Quantity",
    "*variationspecificsname": "VariationSpecificsName",
    "variation specifics name": "VariationSpecificsName",
    "*variationspecificsvalue": "VariationSpecificsValue",
    "variation specifics value": "VariationSpecificsValue",
    "*variationpicturename": "VariationPictureName",
    "variation picture name": "VariationPictureName",
    "*variationpictureurl": "VariationPictureURL",
    "variation picture url": "VariationPictureURL",
  };

  return inputHeaders.map((h) => {
    const key = h.trim().toLowerCase();
    return lowerToCanon.get(key) ?? synonyms[key] ?? h.trim();
  });
}

export function validateAndFixEbayListings(headers: string[], rows: CsvRow[]): CsvFixResult {
  const { fixedRows, fixesApplied } = normalizeRowsSafe(headers, rows);
  const issues: CsvIssue[] = [];

  const canonHeaders = canonicalEbayListingHeaders(headers);

  // Required header checks
  for (const h of ["Title", "StartPrice", "Quantity"]) {
    if (!canonHeaders.includes(h)) {
      issues.push({
        rowIndex: -1,
        column: h,
        severity: "error",
        code: "ebay/missing_required_header",
        message: `Missing required column: ${h}`,
        suggestion: `Add the '${h}' column (eBay File Exchange field).`,
      });
    }
  }

  const canonRows: CsvRow[] = fixedRows.map((r) => {
    const out: CsvRow = {};
    for (let i = 0; i < headers.length; i++) {
      out[canonHeaders[i]] = r?.[headers[i]] ?? "";
    }
    return out;
  });

  // Track duplicate CustomLabels (SKUs) across rows
  const skuRows = new Map<string, number[]>();

  const outRows: CsvRow[] = canonRows.map((r, rowIndex) => {
    const out = { ...r };

    // Action
    if ("Action" in out) {
      const action = (out["Action"] ?? "").trim().toLowerCase();
      if (action && !VALID_ACTIONS.has(action)) {
        issues.push({
          rowIndex,
          column: "Action",
          severity: "error",
          code: "ebay/invalid_action",
          message: `Invalid Action '${out["Action"]}'. Expected Add, Revise, Delete, or End.`,
          suggestion: "Use Add, Revise, Delete, or End.",
        });
      } else if (action && action !== out["Action"].trim().toLowerCase()) {
        // Already handled: just normalize casing to Title Case
        const normalized = action.charAt(0).toUpperCase() + action.slice(1);
        if (normalized !== out["Action"].trim()) {
          out["Action"] = normalized;
          fixesApplied.push(`Normalized Action to '${normalized}' on row ${rowIndex + 1}`);
        }
      }
    }

    // Title (required, max 80 chars)
    const title = (out["Title"] ?? "").trim();
    if (!title) {
      issues.push({
        rowIndex,
        column: "Title",
        severity: "error",
        code: "ebay/missing_title",
        message: "Missing listing Title.",
        suggestion: "Provide a descriptive title for the listing.",
      });
    } else if (title.length > 80) {
      issues.push({
        rowIndex,
        column: "Title",
        severity: "error",
        code: "ebay/title_too_long",
        message: `Title is ${title.length} characters. eBay allows a maximum of 80 characters.`,
        suggestion: "Shorten the title to 80 characters or fewer.",
        details: { length: title.length, max: 80 },
      });
    }

    // StartPrice (required, decimal)
    const priceRaw = out["StartPrice"] ?? "";
    const price = parseShopifyMoney(priceRaw);
    if (price == null) {
      if (!isEmpty(priceRaw)) {
        issues.push({
          rowIndex,
          column: "StartPrice",
          severity: "error",
          code: "ebay/invalid_price",
          message: `StartPrice should be a decimal number. Found '${priceRaw}'.`,
          suggestion: "Use a plain decimal like 19.99 (no currency symbols).",
        });
      } else {
        issues.push({
          rowIndex,
          column: "StartPrice",
          severity: "error",
          code: "ebay/missing_price",
          message: "Missing StartPrice.",
          suggestion: "Provide a listing price.",
        });
      }
    } else {
      const formatted = formatShopifyMoney(price);
      if (formatted !== priceRaw.trim()) {
        out["StartPrice"] = formatted;
        fixesApplied.push(`Normalized StartPrice to '${formatted}' on row ${rowIndex + 1}`);
      }
    }

    // Quantity (required, non-negative integer)
    const qRaw = out["Quantity"] ?? "";
    const qi = parseIntSafe(qRaw);
    if (!qi.ok) {
      issues.push({
        rowIndex,
        column: "Quantity",
        severity: "error",
        code: "ebay/invalid_quantity",
        message: `Quantity should be a non-negative integer. Found '${qRaw}'.`,
        suggestion: "Use a whole number like 0, 1, 10.",
      });
    } else if (qi.value !== qRaw.trim()) {
      out["Quantity"] = qi.value;
      if (!isEmpty(qRaw)) fixesApplied.push(`Normalized Quantity to '${qi.value}' on row ${rowIndex + 1}`);
    }

    // ConditionID (optional, but should be valid if present)
    if ("ConditionID" in out) {
      const cid = (out["ConditionID"] ?? "").trim();
      if (cid && !VALID_CONDITION_IDS.has(cid)) {
        issues.push({
          rowIndex,
          column: "ConditionID",
          severity: "warning",
          code: "ebay/invalid_condition_id",
          message: `ConditionID '${cid}' is not a standard eBay condition value.`,
          suggestion:
            "Use a standard eBay ConditionID (e.g., 1000 = New, 3000 = Good, 5000 = For parts or not working).",
        });
      }
    }

    // Duration (optional, must match GTC or Days_N pattern)
    if ("Duration" in out) {
      const dur = (out["Duration"] ?? "").trim();
      if (dur && !VALID_DURATIONS.test(dur)) {
        issues.push({
          rowIndex,
          column: "Duration",
          severity: "warning",
          code: "ebay/invalid_duration",
          message: `Duration '${dur}' is not a recognized eBay duration value.`,
          suggestion: "Use GTC (Good Till Cancelled) or Days_N (e.g., Days_7, Days_30).",
        });
      }
    }

    // CategoryID (optional per-row; file-level blank check done after loop)
    if ("CategoryID" in out) {
      const cid = (out["CategoryID"] ?? "").trim();
      if (cid && !/^\d+$/.test(cid)) {
        issues.push({
          rowIndex,
          column: "CategoryID",
          severity: "warning",
          code: "ebay/invalid_category_id",
          message: `CategoryID '${cid}' should be a numeric eBay category ID.`,
          suggestion: "Use the numeric eBay CategoryID from the eBay category tree (e.g., 9355 for Cell Phones).",
        });
      }
    }

    // Format (optional, must be FixedPriceItem or Chinese)
    if ("Format" in out) {
      const fmt = (out["Format"] ?? "").trim();
      if (fmt && !VALID_FORMATS.has(fmt.toLowerCase())) {
        issues.push({
          rowIndex,
          column: "Format",
          severity: "warning",
          code: "ebay/invalid_format",
          message: `Format '${fmt}' is not a recognized eBay listing type.`,
          suggestion: "Use FixedPriceItem (Buy It Now) or Chinese (Auction).",
        });
      }
    }

    // PictureURL (pipe-separated, optional)
    if ("PictureURL" in out) {
      const raw = out["PictureURL"] ?? "";
      const urls = String(raw)
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      if (urls.length > 12) {
        issues.push({
          rowIndex,
          column: "PictureURL",
          severity: "warning",
          code: "ebay/too_many_images",
          message: `eBay allows up to 12 images per listing. Found ${urls.length}.`,
          suggestion: "Reduce to 12 or fewer images.",
          details: { count: urls.length },
        });
      }
      const bad = urls.filter((u) => !isHttpUrl(u));
      if (bad.length) {
        issues.push({
          rowIndex,
          column: "PictureURL",
          severity: "warning",
          code: "ebay/invalid_picture_url",
          message: `One or more picture URLs are invalid: ${bad.slice(0, 3).join(", ")}${bad.length > 3 ? "…" : ""}`,
          suggestion: "Use full http(s) URLs separated by pipes (|).",
          details: { badUrls: bad },
        });
      }
      const cleaned = urls.join("|");
      if (cleaned !== String(raw).trim()) {
        out["PictureURL"] = cleaned;
        if (!isEmpty(raw)) fixesApplied.push(`Cleaned PictureURL list on row ${rowIndex + 1}`);
      }
    }

    // DispatchTimeMax (optional, non-negative integer)
    if ("DispatchTimeMax" in out) {
      const dtm = (out["DispatchTimeMax"] ?? "").trim();
      if (dtm) {
        const n = Number.parseInt(dtm, 10);
        if (!Number.isFinite(n) || n < 0) {
          issues.push({
            rowIndex,
            column: "DispatchTimeMax",
            severity: "warning",
            code: "ebay/invalid_dispatch_time",
            message: `DispatchTimeMax should be a non-negative integer. Found '${dtm}'.`,
            suggestion: "Use a whole number (e.g., 1, 3, 5) representing handling days.",
          });
        }
      }
    }

    // Track CustomLabel (SKU) for duplicate detection
    const sku = (out["CustomLabel"] ?? "").trim();
    if (sku) {
      const arr = skuRows.get(sku) ?? [];
      arr.push(rowIndex);
      skuRows.set(sku, arr);
    }

    return out;
  });

  // Cross-row: duplicate CustomLabel (SKU) detection
  for (const [sku, idxs] of skuRows.entries()) {
    if (idxs.length < 2) continue;
    const rows1b = idxs.map((x) => x + 1);
    for (const idx of idxs) {
      issues.push({
        rowIndex: idx,
        column: "CustomLabel",
        severity: "warning",
        code: "ebay/duplicate_sku",
        message: `Duplicate CustomLabel (SKU) '${sku}' found on rows ${rows1b.join(", ")}.`,
        suggestion: "Each unique listing should have a unique CustomLabel. Use Revise action for updates.",
        details: { sku, rows: rows1b },
      });
    }
  }

  // File-level: warn if CategoryID column is present but all values are blank.
  if (canonHeaders.includes("CategoryID")) {
    const allBlank = outRows.every((r) => !String(r["CategoryID"] ?? "").trim());
    if (allBlank) {
      issues.push({
        rowIndex: -1,
        column: "CategoryID",
        severity: "warning",
        code: "ebay/missing_category_id",
        message: "CategoryID column is present but all values are blank.",
        suggestion: "Provide a numeric eBay CategoryID for each listing to ensure correct category placement.",
      });
    }
  }

  // Final header order: canonical eBay columns first, then any extra columns.
  const extra = canonHeaders.filter((h) => !EBAY_LISTING_EXPECTED_HEADERS.includes(h));
  const fixedHeaders = [...EBAY_LISTING_EXPECTED_HEADERS, ...extra];

  const finalRows = outRows.map((r) => {
    const out: CsvRow = {};
    for (const h of fixedHeaders) out[h] = r?.[h] ?? "";
    return out;
  });

  if (fixedHeaders.join("||") !== canonHeaders.join("||")) {
    fixesApplied.push("eBay: enforced canonical header names + preferred order");
  }

  return { fixedHeaders, fixedRows: finalRows, issues, fixesApplied };
}

export function validateAndFixEbayVariations(headers: string[], rows: CsvRow[]): CsvFixResult {
  const { fixedRows, fixesApplied } = normalizeRowsSafe(headers, rows);
  const issues: CsvIssue[] = [];

  const canonHeaders = canonicalEbayVariationHeaders(headers);

  // Required header checks
  for (const h of ["Title", "StartPrice", "Quantity", "VariationSpecificsName", "VariationSpecificsValue"]) {
    if (!canonHeaders.includes(h)) {
      issues.push({
        rowIndex: -1,
        column: h,
        severity: "error",
        code: "ebay/missing_required_header",
        message: `Missing required column for eBay Variations: ${h}`,
        suggestion: `Add the '${h}' column.`,
      });
    }
  }

  const canonRows: CsvRow[] = fixedRows.map((r) => {
    const out: CsvRow = {};
    for (let i = 0; i < headers.length; i++) {
      out[canonHeaders[i]] = r?.[headers[i]] ?? "";
    }
    return out;
  });

  // Track duplicate variation combos (per title + specifics)
  const variantKeys = new Map<string, number[]>();

  const outRows: CsvRow[] = canonRows.map((r, rowIndex) => {
    const out = { ...r };

    // Title required, max 80 chars
    const title = (out["Title"] ?? "").trim();
    if (!title) {
      issues.push({
        rowIndex,
        column: "Title",
        severity: "error",
        code: "ebay/missing_title",
        message: "Missing listing Title.",
        suggestion: "Provide a title for the listing.",
      });
    } else if (title.length > 80) {
      issues.push({
        rowIndex,
        column: "Title",
        severity: "error",
        code: "ebay/title_too_long",
        message: `Title is ${title.length} characters. eBay allows a maximum of 80 characters.`,
        suggestion: "Shorten the title to 80 characters or fewer.",
        details: { length: title.length, max: 80 },
      });
    }

    // StartPrice
    const priceRaw = out["StartPrice"] ?? "";
    const price = parseShopifyMoney(priceRaw);
    if (price == null) {
      if (!isEmpty(priceRaw)) {
        issues.push({
          rowIndex,
          column: "StartPrice",
          severity: "error",
          code: "ebay/invalid_price",
          message: `StartPrice should be a decimal number. Found '${priceRaw}'.`,
          suggestion: "Use a plain decimal like 19.99.",
        });
      } else {
        issues.push({
          rowIndex,
          column: "StartPrice",
          severity: "error",
          code: "ebay/missing_price",
          message: "Missing StartPrice.",
          suggestion: "Provide a variation price.",
        });
      }
    } else {
      const formatted = formatShopifyMoney(price);
      if (formatted !== priceRaw.trim()) {
        out["StartPrice"] = formatted;
        fixesApplied.push(`Normalized StartPrice to '${formatted}' on row ${rowIndex + 1}`);
      }
    }

    // Quantity
    const qRaw = out["Quantity"] ?? "";
    const qi = parseIntSafe(qRaw);
    if (!qi.ok) {
      issues.push({
        rowIndex,
        column: "Quantity",
        severity: "error",
        code: "ebay/invalid_quantity",
        message: `Quantity should be a non-negative integer. Found '${qRaw}'.`,
        suggestion: "Use a whole number like 0, 1, 10.",
      });
    } else if (qi.value !== qRaw.trim()) {
      out["Quantity"] = qi.value;
      if (!isEmpty(qRaw)) fixesApplied.push(`Normalized Quantity to '${qi.value}' on row ${rowIndex + 1}`);
    }

    // VariationSpecifics pairing check
    const vsName = (out["VariationSpecificsName"] ?? "").trim();
    const vsValue = (out["VariationSpecificsValue"] ?? "").trim();
    if ((!vsName && vsValue) || (vsName && !vsValue)) {
      issues.push({
        rowIndex,
        column: "VariationSpecificsValue",
        severity: "error",
        code: "ebay/variation_specifics_mismatch",
        message: "VariationSpecificsName and VariationSpecificsValue must both be provided or both empty.",
        suggestion: "Provide both VariationSpecificsName and VariationSpecificsValue for each variation row.",
      });
    }

    // VariationPictureURL validation
    if ("VariationPictureURL" in out) {
      const picUrl = (out["VariationPictureURL"] ?? "").trim();
      if (picUrl && !isHttpUrl(picUrl)) {
        issues.push({
          rowIndex,
          column: "VariationPictureURL",
          severity: "warning",
          code: "ebay/invalid_picture_url",
          message: `VariationPictureURL is not a valid URL: '${picUrl}'.`,
          suggestion: "Use a full http(s) URL.",
        });
      }
    }

    // Track duplicate variation combination
    if (vsName && vsValue) {
      const label = (out["CustomLabel"] ?? "").trim() || title;
      const key = `${label}||${vsName.toLowerCase()}||${vsValue.toLowerCase()}`;
      const arr = variantKeys.get(key) ?? [];
      arr.push(rowIndex);
      variantKeys.set(key, arr);
    }

    return out;
  });

  // Cross-row: duplicate variation combo detection
  for (const [key, idxs] of variantKeys.entries()) {
    if (idxs.length < 2) continue;
    const rows1b = idxs.map((x) => x + 1);
    for (const idx of idxs) {
      issues.push({
        rowIndex: idx,
        column: "VariationSpecificsValue",
        severity: "error",
        code: "ebay/duplicate_variation_combo",
        message: `Duplicate variation specifics combination detected (rows ${rows1b.join(", ")}).`,
        suggestion: "Each variation under the same listing must have a unique attribute combination.",
        details: { signature: key, rows: rows1b },
      });
    }
  }

  const extra = canonHeaders.filter((h) => !EBAY_VARIATION_EXPECTED_HEADERS.includes(h));
  const fixedHeaders = [...EBAY_VARIATION_EXPECTED_HEADERS, ...extra];

  const finalRows = outRows.map((r) => {
    const out: CsvRow = {};
    for (const h of fixedHeaders) out[h] = r?.[h] ?? "";
    return out;
  });

  if (fixedHeaders.join("||") !== canonHeaders.join("||")) {
    fixesApplied.push("eBay Variations: enforced canonical header names + preferred order");
  }

  return { fixedHeaders, fixedRows: finalRows, issues, fixesApplied };
}
