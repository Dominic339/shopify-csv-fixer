// src/lib/etsyOptimizer.ts

import type { CsvFixResult, CsvIssue, CsvRow } from "@/lib/formats/types";
import { normalizeRowsSafe } from "@/lib/formats/engine";
import { isHttpUrl, parseShopifyMoney, formatShopifyMoney } from "@/lib/shopifySchema";

// Note: Etsy does not provide a universal "import new listings" CSV spec for all sellers.
// This preset targets common listing CSV fields used in export/bulk-edit workflows.
export const ETSY_EXPECTED_HEADERS = [
  "Listing ID",
  "Title",
  "Description",
  "Price",
  "Currency",
  "Quantity",
  "SKU",
  "Tags",
  "Materials",
  "Image URLs",
];

export const ETSY_EXAMPLE_ROW: CsvRow = {
  "Listing ID": "",
  Title: "Handmade Leather Wallet",
  Description: "Full description of the item, materials, sizing, and shipping details.",
  Price: "45.00",
  Currency: "USD",
  Quantity: "10",
  SKU: "ETSY-WALLET-LEATHER-01",
  Tags: "wallet,leather,handmade,gift",
  Materials: "leather,thread",
  "Image URLs": "https://example.com/images/wallet-1.jpg,https://example.com/images/wallet-2.jpg",
};

function isEmpty(v: string) {
  return !String(v ?? "").trim();
}

function normalizeList(value: string) {
  const parts = String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.join(",");
}

function parseIntSafe(v: string) {
  if (!String(v ?? "").trim()) return { ok: true, value: "" };
  const n = Number.parseInt(String(v).trim(), 10);
  if (!Number.isFinite(n)) return { ok: false, value: v };
  return { ok: true, value: String(n) };
}

export function validateAndFixEtsyListings(headers: string[], rows: CsvRow[]): CsvFixResult {
  const { fixedRows, fixesApplied } = normalizeRowsSafe(headers, rows);
  const issues: CsvIssue[] = [];

  // Canonicalize header names (best-effort).
  const lowerToCanon = new Map(ETSY_EXPECTED_HEADERS.map((h) => [h.toLowerCase(), h] as const));
  const synonyms: Record<string, string> = {
    id: "Listing ID",
    listingid: "Listing ID",
    listing_id: "Listing ID",
    currency_code: "Currency",
    image: "Image URLs",
    images: "Image URLs",
    image_urls: "Image URLs",
    "image urls": "Image URLs",
  };

  const canonHeaders = headers.map((h) => {
    const key = h.trim().toLowerCase();
    return lowerToCanon.get(key) ?? synonyms[key] ?? h.trim();
  });

  for (const h of ["Title", "Price", "Quantity"]) {
    if (!canonHeaders.includes(h)) {
      issues.push({
        rowIndex: -1,
        column: h,
        severity: "error",
        code: "etsy/missing_required_header",
        message: `Missing required column: ${h}`,
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

  const outRows: CsvRow[] = canonRows.map((r, rowIndex) => {
    const out = { ...r };

    const title = (out["Title"] ?? "").trim();
    if (!title) {
      issues.push({
        rowIndex,
        column: "Title",
        severity: "error",
        code: "etsy/missing_title",
        message: "Missing Title.",
        suggestion: "Provide a descriptive listing title.",
      });
    } else if (title.length > 140) {
      issues.push({
        rowIndex,
        column: "Title",
        severity: "warning",
        code: "etsy/title_too_long",
        message: `Title is ${title.length} characters. Etsy titles are typically limited to 140 characters.`,
        suggestion: "Shorten the title to 140 characters or fewer.",
      });
    }

    // Price
    const priceRaw = out["Price"] ?? "";
    const p = parseShopifyMoney(priceRaw);
    if (p == null) {
      if (!isEmpty(priceRaw)) {
        issues.push({
          rowIndex,
          column: "Price",
          severity: "error",
          code: "etsy/invalid_price",
          message: `Price should be a decimal number. Found '${priceRaw}'.`,
          suggestion: "Use a plain decimal like 19.99.",
        });
      } else {
        issues.push({
          rowIndex,
          column: "Price",
          severity: "error",
          code: "etsy/missing_price",
          message: "Missing Price.",
          suggestion: "Provide a listing price.",
        });
      }
    } else {
      const formatted = formatShopifyMoney(p);
      if (formatted !== priceRaw.trim()) {
        out["Price"] = formatted;
        fixesApplied.push(`Normalized Price to '${formatted}' on row ${rowIndex + 1}`);
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
        code: "etsy/invalid_quantity",
        message: `Quantity should be a whole number. Found '${qRaw}'.`,
        suggestion: "Use an integer like 0, 1, 10.",
      });
    } else if (qi.value !== qRaw.trim()) {
      out["Quantity"] = qi.value;
      if (!isEmpty(qRaw)) fixesApplied.push(`Normalized Quantity to '${qi.value}' on row ${rowIndex + 1}`);
    }

    // Currency (3-letter)
    if ("Currency" in out) {
      const c = (out["Currency"] ?? "").trim().toUpperCase();
      if (c && !/^[A-Z]{3}$/.test(c)) {
        issues.push({
          rowIndex,
          column: "Currency",
          severity: "warning",
          code: "etsy/invalid_currency",
          message: `Currency should be a 3-letter code (e.g., USD). Found '${out["Currency"]}'.`,
          suggestion: "Use a 3-letter ISO currency code.",
        });
      } else if (c && c !== out["Currency"]) {
        out["Currency"] = c;
        fixesApplied.push(`Normalized Currency to '${c}' on row ${rowIndex + 1}`);
      }
    }

    // Tags: Etsy commonly allows up to 13 tags; each tag has a character limit.
    if ("Tags" in out) {
      const before = out["Tags"];
      const after = normalizeList(before);
      if (after !== String(before ?? "").trim()) {
        out["Tags"] = after;
        if (!isEmpty(before)) fixesApplied.push(`Normalized Tags formatting on row ${rowIndex + 1}`);
      }
      const tags = after
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (tags.length > 13) {
        issues.push({
          rowIndex,
          column: "Tags",
          severity: "warning",
          code: "etsy/too_many_tags",
          message: `Found ${tags.length} tags. Etsy typically allows up to 13 tags per listing.`,
          suggestion: "Reduce to 13 tags or fewer.",
          details: { tagCount: tags.length },
        });
      }
      const tooLong = tags.filter((t) => t.length > 20);
      if (tooLong.length) {
        issues.push({
          rowIndex,
          column: "Tags",
          severity: "warning",
          code: "etsy/tag_too_long",
          message: `One or more tags exceed 20 characters: ${tooLong.slice(0, 3).join(", ")}${tooLong.length > 3 ? "…" : ""}`,
          suggestion: "Shorten long tags to 20 characters or fewer.",
          details: { tags: tooLong },
        });
      }
    }

    // Materials
    if ("Materials" in out) {
      const before = out["Materials"];
      const after = normalizeList(before);
      if (after !== String(before ?? "").trim()) {
        out["Materials"] = after;
        if (!isEmpty(before)) fixesApplied.push(`Normalized Materials formatting on row ${rowIndex + 1}`);
      }
    }

    // Image URLs
    if ("Image URLs" in out) {
      const before = out["Image URLs"];
      const urls = String(before ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const bad = urls.filter((u) => !isHttpUrl(u));
      if (bad.length) {
        issues.push({
          rowIndex,
          column: "Image URLs",
          severity: "warning",
          code: "etsy/invalid_image_url",
          message: `One or more image URLs are invalid: ${bad.slice(0, 3).join(", ")}${bad.length > 3 ? "…" : ""}`,
          suggestion: "Use full http(s) URLs separated by commas.",
          details: { badUrls: bad },
        });
      }
      const cleaned = urls.join(",");
      if (cleaned !== String(before ?? "").trim()) {
        out["Image URLs"] = cleaned;
        if (!isEmpty(before)) fixesApplied.push(`Cleaned Image URLs list on row ${rowIndex + 1}`);
      }
    }

    return out;
  });

  const extra = canonHeaders.filter((h) => !ETSY_EXPECTED_HEADERS.includes(h));
  const fixedHeaders = [...ETSY_EXPECTED_HEADERS, ...extra];

  const finalRows = outRows.map((r) => {
    const out: CsvRow = {};
    for (const h of fixedHeaders) out[h] = r?.[h] ?? "";
    return out;
  });

  if (fixedHeaders.join("||") !== canonHeaders.join("||")) {
    fixesApplied.push("Etsy: enforced canonical header names + preferred order");
  }

  return { fixedHeaders, fixedRows: finalRows, issues, fixesApplied };
}
