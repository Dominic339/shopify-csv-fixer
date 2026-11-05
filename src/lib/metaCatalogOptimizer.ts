// src/lib/metaCatalogOptimizer.ts
// Meta (Facebook and Instagram) catalog product feeds, one product per row.
//
// Rules follow Meta's catalog product fields reference
// (developers.facebook.com/docs/marketing-api/catalog/reference): the same attribute names as
// Google's feed, but availability is "in stock" / "out of stock", ids, titles and descriptions
// may be longer, and every product needs at least one of brand, gtin or mpn.
// Prices, barcodes and gender values are read with the Merchant Center helpers.
// A file keeps its own column names and order on export.

import type { CsvFixResult, CsvIssue, CsvRow } from "@/lib/formats/types";
import { normalizeRowsSafe } from "@/lib/formats/engine";
import { isHttpUrl } from "@/lib/shopifySchema";
import { checkBarcode } from "@/lib/tools/barcodes";
import { CONDITION, GENDER, formatGooglePrice, parseGooglePrice, type GooglePrice } from "@/lib/googleMerchantOptimizer";

export const META_CATALOG_EXPECTED_HEADERS = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "image_link",
  "brand",
  "additional_image_link",
  "sale_price",
  "sale_price_effective_date",
  "gtin",
  "mpn",
  "google_product_category",
  "fb_product_category",
  "item_group_id",
  "color",
  "size",
  "gender",
  "age_group",
  "material",
  "pattern",
  "quantity_to_sell_on_facebook",
  "shipping_weight",
];

export const META_CATALOG_EXAMPLE_ROW: Record<string, string> = {
  id: "TSHIRT-ORGANIC-BLUE-M",
  title: "Organic Cotton T-Shirt, Blue, Medium",
  description: "Soft organic cotton t-shirt with a relaxed fit.",
  availability: "in stock",
  condition: "new",
  price: "24.99 USD",
  link: "https://example.com/products/organic-cotton-tshirt?variant=blue-m",
  image_link: "https://example.com/images/tshirt-blue.jpg",
  brand: "Acme Apparel",
  additional_image_link: "",
  sale_price: "",
  sale_price_effective_date: "",
  gtin: "0012345678905",
  mpn: "",
  google_product_category: "212",
  fb_product_category: "",
  item_group_id: "TSHIRT-ORGANIC",
  color: "Blue",
  size: "M",
  gender: "unisex",
  age_group: "adult",
  material: "cotton",
  pattern: "",
  quantity_to_sell_on_facebook: "",
  shipping_weight: "0.2 kg",
};

/** Attributes every Meta catalog product needs. */
const REQUIRED = ["id", "title", "description", "availability", "condition", "price", "link", "image_link"] as const;

/** Meta's limits: id 100, title 200 (65 recommended), description 9999, up to 50 extra images. */
const LIMITS = { id: 100, title: 200, description: 9999, images: 50 } as const;

/** Meta accepts "in stock" and "out of stock"; Google-style and common store spellings are converted. */
const AVAILABILITY: Record<string, string> = {
  "in stock": "in stock",
  in_stock: "in stock",
  instock: "in stock",
  "in-stock": "in stock",
  available: "in stock",
  "out of stock": "out of stock",
  out_of_stock: "out of stock",
  outofstock: "out of stock",
  "out-of-stock": "out of stock",
  "sold out": "out of stock",
  soldout: "out of stock",
  unavailable: "out of stock",
};

/** Values Meta used to accept and now doesn't; they get their own advice instead of a guess. */
const RETIRED_AVAILABILITY = /^(pre[\s_-]?order|back[\s_-]?order|available for order|discontinued)$/i;

const AGE_GROUP: Record<string, string> = {
  newborn: "newborn",
  infant: "infant",
  toddler: "toddler",
  kids: "kids",
  kid: "kids",
  children: "kids",
  teen: "teen",
  teens: "teen",
  adult: "adult",
  adults: "adult",
  "all ages": "all ages",
  all_ages: "all ages",
};

const key = (h: string) =>
  h
    .trim()
    .toLowerCase()
    .replace(/^g:/, "")
    .replace(/[\s-]+/g, "_");

function canonicalHeaders(headers: string[]): string[] {
  const known = new Set(META_CATALOG_EXPECTED_HEADERS);
  const synonyms: Record<string, string> = { image_url: "image_link", url: "link", product_link: "link", additional_image_links: "additional_image_link", ean: "gtin", upc: "gtin", barcode: "gtin" };
  return headers.map((h) => {
    const k = key(h);
    return known.has(k) ? k : (synonyms[k] ?? h.trim());
  });
}

const blank = (v: string | undefined) => !String(v ?? "").trim();

export function validateAndFixMetaCatalog(headers: string[], rows: CsvRow[]): CsvFixResult {
  const { fixedRows, fixesApplied } = normalizeRowsSafe(headers, rows);
  const issues: CsvIssue[] = [];
  const canon = canonicalHeaders(headers);
  const has = (c: string) => canon.includes(c);

  for (const col of REQUIRED) {
    if (!has(col)) {
      issues.push({
        rowIndex: -1,
        column: col,
        severity: "error",
        code: "meta/missing_required_header",
        message: `Missing required column: ${col}`,
        suggestion: `Add the '${col}' column. Meta requires it for every product.`,
      });
    }
  }

  const rowsIn: CsvRow[] = fixedRows.map((r) => {
    const out: CsvRow = {};
    headers.forEach((h, i) => (out[canon[i]] = r?.[h] ?? ""));
    return out;
  });

  const idRows = new Map<string, number[]>();

  const rowsOut = rowsIn.map((r, rowIndex) => {
    const out = { ...r };
    const n = rowIndex + 1;
    const flag = (column: string, severity: CsvIssue["severity"], code: string, message: string, suggestion: string, details?: Record<string, unknown>) =>
      issues.push({ rowIndex, column, severity, code, message, suggestion, ...(details ? { details } : {}) });

    for (const col of REQUIRED) {
      if (has(col) && blank(out[col])) flag(col, "error", "meta/missing_value", `${col} is blank.`, `Meta can't upload a product without ${col}.`);
    }

    const id = (out.id ?? "").trim();
    if (id) {
      if (id.length > LIMITS.id) flag("id", "error", "meta/id_too_long", `id is ${id.length} characters. Meta allows up to 100.`, "Shorten the id, for example to the SKU. Keep it stable once products are live.", { length: id.length, max: LIMITS.id });
      const list = idRows.get(id) ?? [];
      list.push(rowIndex);
      idRows.set(id, list);
    }

    const title = (out.title ?? "").trim();
    if (title.length > LIMITS.title) flag("title", "warning", "meta/title_too_long", `title is ${title.length} characters. Meta allows up to 200 and recommends 65.`, "Shorten the title, putting the most important words first.", { length: title.length, max: LIMITS.title });
    const desc = (out.description ?? "").trim();
    if (desc.length > LIMITS.description) flag("description", "warning", "meta/description_too_long", `description is ${desc.length} characters. Meta allows up to 9999.`, "Shorten the description.", { length: desc.length, max: LIMITS.description });

    for (const col of ["link", "image_link"]) {
      const v = (out[col] ?? "").trim();
      if (v && !isHttpUrl(v)) flag(col, "error", "meta/invalid_url", `${col} must be a full http:// or https:// URL. Found '${v}'.`, "Use the full address, starting with https://.");
    }
    if (has("additional_image_link") && !blank(out.additional_image_link)) {
      // Meta accepts commas, semicolons, spaces or vertical bars between the URLs.
      const urls = (out.additional_image_link ?? "").split(/[\s,;|]+/).filter(Boolean);
      const bad = urls.filter((u) => !isHttpUrl(u));
      if (bad.length) flag("additional_image_link", "warning", "meta/invalid_url", `additional_image_link must be a full http:// or https:// URL. Found '${bad[0]}'.`, "Use the full address, starting with https://.");
      if (urls.length > LIMITS.images) flag("additional_image_link", "warning", "meta/too_many_images", `additional_image_link has ${urls.length} URLs. Meta uses up to 50.`, "Keep the 50 best extra images.", { count: urls.length, max: LIMITS.images });
    }

    const availRaw = (out.availability ?? "").trim();
    if (availRaw) {
      const a = AVAILABILITY[availRaw.toLowerCase()];
      if (!a && RETIRED_AVAILABILITY.test(availRaw)) {
        flag("availability", "error", "meta/invalid_availability", `availability '${availRaw}' is no longer accepted. Meta takes in stock or out of stock.`, "Use in stock if customers can order it now, or out of stock if they can't.");
      } else if (!a) {
        flag("availability", "error", "meta/invalid_availability", `availability must be in stock or out of stock. Found '${availRaw}'.`, "Use one of Meta's two values.");
      } else if (a !== availRaw) {
        out.availability = a;
        fixesApplied.push(`Normalized availability to '${a}' on row ${n}`);
      }
    }

    let price: GooglePrice | null = null;
    const priceRaw = (out.price ?? "").trim();
    if (priceRaw) {
      const p = parseGooglePrice(priceRaw);
      if (p === "no-currency") flag("price", "error", "meta/price_missing_currency", `price '${priceRaw}' has no currency code. Write it like 9.99 USD.`, "Add the three-letter ISO 4217 currency code after the number.");
      else if (!p) flag("price", "error", "meta/invalid_price", `price should be a number and a currency code, like 9.99 USD. Found '${priceRaw}'.`, "Write the price as a number followed by the currency code.");
      else if (p.amount === 0) flag("price", "error", "meta/invalid_price", "price can't be 0.", "Enter the price the customer pays.");
      else {
        price = p;
        const f = formatGooglePrice(p);
        if (f !== priceRaw) {
          out.price = f;
          fixesApplied.push(`Normalized price to '${f}' on row ${n}`);
        }
      }
    }
    const saleRaw = (out.sale_price ?? "").trim();
    if (saleRaw) {
      const s = parseGooglePrice(saleRaw);
      if (s === "no-currency" || !s) flag("sale_price", "warning", "meta/invalid_sale_price", `sale_price should be a number and a currency code, like 7.99 USD. Found '${saleRaw}'.`, "Write the sale price as a number followed by the currency code.");
      else {
        const f = formatGooglePrice(s);
        if (f !== saleRaw) {
          out.sale_price = f;
          fixesApplied.push(`Normalized sale_price to '${f}' on row ${n}`);
        }
        if (price && s.currency === price.currency && s.amount >= price.amount) {
          flag("sale_price", "warning", "meta/invalid_sale_price", `sale_price (${formatGooglePrice(s)}) isn't lower than price (${formatGooglePrice(price)}).`, "Set price to the regular price and sale_price to the lower one.");
        }
      }
    }

    const condRaw = (out.condition ?? "").trim();
    if (condRaw) {
      const c = CONDITION[condRaw.toLowerCase()];
      if (!c) flag("condition", "error", "meta/invalid_condition", `condition must be new, refurbished or used. Found '${condRaw}'.`, "Use one of Meta's three values.");
      else if (c !== condRaw) {
        out.condition = c;
        fixesApplied.push(`Normalized condition to '${c}' on row ${n}`);
      }
    }

    const gtinRaw = (out.gtin ?? "").trim();
    if (gtinRaw) {
      const c = checkBarcode(gtinRaw);
      if (c.status === "lost") flag("gtin", "error", "meta/invalid_gtin", `gtin '${gtinRaw}' looks like scientific notation, so digits were lost. Re-export the column as text.`, "Copy the barcodes again from the original source.");
      else if (c.status === "invalid") flag("gtin", "error", "meta/invalid_gtin", `gtin '${gtinRaw}' isn't a valid GTIN: it needs 8, 12, 13 or 14 digits with a correct check digit.`, "Check the barcode on the packaging, or leave gtin blank and fill in brand or mpn.");
      else if (c.status === "fixed" && c.value !== gtinRaw) {
        out.gtin = c.value;
        fixesApplied.push(`Cleaned gtin on row ${n}`);
      }
    }

    // Meta needs at least one of brand, gtin or mpn on every product.
    if (blank(out.brand) && blank(out.gtin) && blank(out.mpn)) {
      flag(has("brand") ? "brand" : "id", "error", "meta/missing_identifier", "There is no brand, gtin or mpn.", "Fill in the brand, or the barcode (gtin) or manufacturer part number (mpn). For your own products, use your store's name as the brand.");
    }

    for (const [col, map, allowed] of [
      ["gender", GENDER, "female, male or unisex"],
      ["age_group", AGE_GROUP, "adult, all ages, teen, kids, toddler, infant or newborn"],
    ] as const) {
      const raw = (out[col] ?? "").trim();
      if (!raw) continue;
      const v = (map as Record<string, string>)[raw.toLowerCase()];
      if (!v) flag(col, "warning", col === "gender" ? "meta/invalid_gender" : "meta/invalid_age_group", `${col} must be ${allowed}. Found '${raw}'.`, "Use one of Meta's values.");
      else if (v !== raw) {
        out[col] = v;
        fixesApplied.push(`Normalized ${col} to '${v}' on row ${n}`);
      }
    }

    return out;
  });

  for (const [id, list] of idRows) {
    if (list.length < 2) continue;
    const rowsList = list.map((i) => i + 1).join(", ");
    for (const rowIndex of list) {
      issues.push({
        rowIndex,
        column: "id",
        severity: "error",
        code: "meta/duplicate_id",
        message: `id '${id}' is used on rows ${rowsList}.`,
        suggestion: "Give every product (and every variant) its own id.",
        details: { id, rows: list.map((i) => i + 1) },
      });
    }
  }

  // Keep the file's own column names and order.
  const finalRows = rowsOut.map((r) => {
    const out: CsvRow = {};
    headers.forEach((h, i) => (out[h] = r[canon[i]] ?? ""));
    return out;
  });
  const originalOf = new Map(canon.map((c, i) => [c, headers[i]] as const));
  for (const it of issues) it.column = originalOf.get(it.column) ?? it.column;

  return { fixedHeaders: [...headers], fixedRows: finalRows, issues, fixesApplied };
}
