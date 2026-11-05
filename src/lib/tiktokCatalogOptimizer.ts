// src/lib/tiktokCatalogOptimizer.ts
// TikTok catalog product feeds (TikTok Ads Manager catalogs), one product per row.
//
// Rules follow TikTok's "Catalog product parameters" help page
// (ads.tiktok.com/help/article/catalog-product-parameters): nine required fields, with
// sku_id as the product identifier and brand always required; five availability values;
// prices like 9.99 USD (the currency defaults to the catalog's country when left out);
// images as JPG or PNG on a host TikTok can read; up to 10 extra images.
// Prices, conditions, barcodes and gender values are read with the Merchant Center helpers.
// A file keeps its own column names and order on export, except that a Google- or Meta-style
// "id" column is renamed to TikTok's "sku_id".

import type { CsvFixResult, CsvIssue, CsvRow } from "@/lib/formats/types";
import { normalizeRowsSafe } from "@/lib/formats/engine";
import { isHttpUrl } from "@/lib/shopifySchema";
import { checkBarcode } from "@/lib/tools/barcodes";
import { CONDITION, GENDER, formatGooglePrice, parseGooglePrice, type GooglePrice } from "@/lib/googleMerchantOptimizer";

export const TIKTOK_CATALOG_EXPECTED_HEADERS = [
  "sku_id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "image_link",
  "brand",
  "additional_image_link",
  "video_link",
  "sale_price",
  "sale_price_effective_date",
  "item_group_id",
  "google_product_category",
  "product_type",
  "color",
  "size",
  "gender",
  "age_group",
  "material",
  "pattern",
  "gtin",
  "mpn",
  "shipping_weight",
];

export const TIKTOK_CATALOG_EXAMPLE_ROW: Record<string, string> = {
  sku_id: "TSHIRT-ORGANIC-BLUE-M",
  title: "Organic Cotton T-Shirt, Blue, Medium",
  description: "Soft organic cotton t-shirt with a relaxed fit.",
  availability: "in stock",
  condition: "new",
  price: "24.99 USD",
  link: "https://example.com/products/organic-cotton-tshirt?variant=blue-m",
  image_link: "https://example.com/images/tshirt-blue.jpg",
  brand: "Acme Apparel",
  additional_image_link: "",
  video_link: "",
  sale_price: "",
  sale_price_effective_date: "",
  item_group_id: "TSHIRT-ORGANIC",
  google_product_category: "Apparel & Accessories > Clothing > Shirts & Tops",
  product_type: "",
  color: "Blue",
  size: "M",
  gender: "unisex",
  age_group: "adult",
  material: "cotton",
  pattern: "",
  gtin: "0012345678905",
  mpn: "",
  shipping_weight: "0.2 kg",
};

/** Fields every TikTok catalog product needs. */
const REQUIRED = ["sku_id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand"] as const;

const MAX_IMAGES = 10;

/** TikTok's five availability values; Google- and Meta-style spellings are converted. */
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
  preorder: "preorder",
  "pre-order": "preorder",
  pre_order: "preorder",
  "pre order": "preorder",
  "available for order": "available for order",
  available_for_order: "available for order",
  discontinued: "discontinued",
};

/** TikTok lists the age groups by name with their ages; both forms are accepted as written. */
const AGE_GROUP = /^(newborn|infant|toddler|kids|adult)(\s*\(.*\))?$/i;

/** Image hosts TikTok's help page lists as unsupported. */
const BAD_IMAGE_HOST = /(^|\.)(drive\.google\.com|docs\.google\.com|dropbox\.com|dropboxusercontent\.com|flickr\.com|pinterest\.[a-z.]+|pinimg\.com|500px\.com|imgbb\.com|ibb\.co|smugmug\.com)$/i;

/** Promotional wording TikTok doesn't allow in titles. */
const PROMO = /\bfree (shipping|delivery)\b|\b\d{1,2}\s?% off\b|\bbuy now\b|\bbest price\b/i;
// ©, ® and ™ count as pictographs in Unicode but are fine in a title.
const EMOJI = /(?![©®™])\p{Extended_Pictographic}/u;

const key = (h: string) =>
  h
    .trim()
    .toLowerCase()
    .replace(/^g:/, "")
    .replace(/[\s-]+/g, "_");

function canonicalHeaders(headers: string[]): string[] {
  const known = new Set(TIKTOK_CATALOG_EXPECTED_HEADERS);
  const synonyms: Record<string, string> = {
    id: "sku_id",
    sku: "sku_id",
    image_url: "image_link",
    url: "link",
    product_link: "link",
    additional_image_links: "additional_image_link",
    ean: "gtin",
    upc: "gtin",
    barcode: "gtin",
  };
  // A synonym only stands in for a field the file doesn't already have (once).
  const taken = new Set(headers.map(key).filter((k) => known.has(k)));
  return headers.map((h) => {
    const k = key(h);
    if (known.has(k)) return k;
    const s = synonyms[k];
    if (s && !taken.has(s)) {
      taken.add(s);
      return s;
    }
    return h.trim();
  });
}

const blank = (v: string | undefined) => !String(v ?? "").trim();

/** The file extension of a URL's path, lower-cased, or "" when it has none. */
function urlExtension(u: string): string {
  try {
    const m = new URL(u).pathname.match(/\.([a-z0-9]{2,5})$/i);
    return m ? m[1].toLowerCase() : "";
  } catch {
    return "";
  }
}

function urlHost(u: string): string {
  try {
    return new URL(u).hostname;
  } catch {
    return "";
  }
}

export function validateAndFixTikTokCatalog(headers: string[], rows: CsvRow[]): CsvFixResult {
  const { fixedRows, fixesApplied } = normalizeRowsSafe(headers, rows);
  const issues: CsvIssue[] = [];
  const canon = canonicalHeaders(headers);
  const has = (c: string) => canon.includes(c);

  // TikTok reads the identifier only from a column named sku_id, so a Google- or Meta-style
  // "id" column (or a plain "SKU" one) is renamed on export when there is no sku_id already.
  const outHeaders = [...headers];
  const idCol = canon.indexOf("sku_id");
  if (idCol >= 0 && key(headers[idCol]) !== "sku_id") {
    fixesApplied.push(`Renamed column '${headers[idCol]}' to 'sku_id'`);
    outHeaders[idCol] = "sku_id";
  }

  for (const col of REQUIRED) {
    if (!has(col)) {
      issues.push({
        rowIndex: -1,
        column: col,
        severity: "error",
        code: "tiktok/missing_required_header",
        message: `Missing required column: ${col}`,
        suggestion: `Add the '${col}' column. TikTok requires it for every product.`,
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
      if (has(col) && blank(out[col])) {
        if (col === "brand") flag(col, "error", "tiktok/missing_value", "brand is blank.", "TikTok requires a brand for every product. For products you make yourself, use your store's name.");
        else flag(col, "error", "tiktok/missing_value", `${col} is blank.`, `TikTok can't upload a product without ${col}.`);
      }
    }

    const id = (out.sku_id ?? "").trim();
    if (id) {
      const list = idRows.get(id) ?? [];
      list.push(rowIndex);
      idRows.set(id, list);
    }

    const title = (out.title ?? "").trim();
    if (title && EMOJI.test(title)) flag("title", "warning", "tiktok/title_promotional", "title contains an emoji. TikTok doesn't allow emoji in titles.", "Remove the emoji and describe the product in words.");
    else if (PROMO.test(title)) flag("title", "warning", "tiktok/title_promotional", `title contains promotional text ('${title.match(PROMO)?.[0] ?? ""}').`, "TikTok rejects titles with offers like free shipping. Describe the product instead, and put offers in the ad.");

    for (const col of ["link"]) {
      const v = (out[col] ?? "").trim();
      if (v && !isHttpUrl(v)) flag(col, "error", "tiktok/invalid_url", `${col} must be a full http:// or https:// URL. Found '${v}'.`, "Use the full address, starting with https://.");
    }

    const checkImage = (col: string, u: string, severity: CsvIssue["severity"]) => {
      if (!isHttpUrl(u)) {
        flag(col, severity, "tiktok/invalid_url", `${col} must be a full http:// or https:// URL. Found '${u}'.`, "Use the full address, starting with https://.");
        return true;
      }
      if (BAD_IMAGE_HOST.test(urlHost(u))) {
        flag(col, severity, "tiktok/unsupported_image", `${col} is on ${urlHost(u)}, which TikTok can't read images from.`, "Host the image on your store or a public image host, and link to the image file itself.");
        return true;
      }
      const ext = urlExtension(u);
      if (ext && !["jpg", "jpeg", "png"].includes(ext)) {
        flag(col, "warning", "tiktok/unsupported_image", `${col} is a .${ext} file. TikTok takes JPG or PNG images.`, "Link to a JPG or PNG version of the image.");
        return true;
      }
      return false;
    };

    const image = (out.image_link ?? "").trim();
    if (image) checkImage("image_link", image, "error");
    if (has("additional_image_link") && !blank(out.additional_image_link)) {
      // TikTok takes up to 10 URLs separated by commas.
      const urls = (out.additional_image_link ?? "").split(/[\s,;|]+/).filter(Boolean);
      for (const u of urls) if (checkImage("additional_image_link", u, "warning")) break;
      if (urls.length > MAX_IMAGES) flag("additional_image_link", "warning", "tiktok/too_many_images", `additional_image_link has ${urls.length} URLs. TikTok uses up to 10.`, "Keep the 10 best extra images.", { count: urls.length, max: MAX_IMAGES });
    }

    const availRaw = (out.availability ?? "").trim();
    if (availRaw) {
      const a = AVAILABILITY[availRaw.toLowerCase()];
      if (!a) flag("availability", "error", "tiktok/invalid_availability", `availability must be in stock, available for order, preorder, out of stock or discontinued. Found '${availRaw}'.`, "Use one of TikTok's five values.");
      else if (a !== availRaw) {
        out.availability = a;
        fixesApplied.push(`Normalized availability to '${a}' on row ${n}`);
      }
    }

    let price: GooglePrice | null = null;
    const priceRaw = (out.price ?? "").trim();
    if (priceRaw) {
      const p = parseGooglePrice(priceRaw);
      if (p === "no-currency") flag("price", "warning", "tiktok/price_missing_currency", `price '${priceRaw}' has no currency code, so TikTok will use the currency of the catalog's country.`, "Add the currency code, like 9.99 USD, so the price can't be read in the wrong currency.");
      else if (!p) flag("price", "error", "tiktok/invalid_price", `price should be a number and a currency code, like 9.99 USD. Found '${priceRaw}'.`, "Write the price as a number followed by the currency code.");
      else if (p.amount === 0) flag("price", "error", "tiktok/invalid_price", "price can't be 0.", "Enter the price the customer pays.");
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
      if (s === "no-currency" || !s) flag("sale_price", "warning", "tiktok/invalid_sale_price", `sale_price should be a number and a currency code, like 7.99 USD. Found '${saleRaw}'.`, "Write the sale price as a number followed by the currency code.");
      else {
        const f = formatGooglePrice(s);
        if (f !== saleRaw) {
          out.sale_price = f;
          fixesApplied.push(`Normalized sale_price to '${f}' on row ${n}`);
        }
        if (price && s.currency === price.currency && s.amount >= price.amount) {
          flag("sale_price", "warning", "tiktok/invalid_sale_price", `sale_price (${formatGooglePrice(s)}) isn't lower than price (${formatGooglePrice(price)}).`, "Set price to the regular price and sale_price to the lower one.");
        }
      }
    }

    const condRaw = (out.condition ?? "").trim();
    if (condRaw) {
      const c = CONDITION[condRaw.toLowerCase()];
      if (!c) flag("condition", "error", "tiktok/invalid_condition", `condition must be new, refurbished or used. Found '${condRaw}'.`, "Use one of TikTok's three values.");
      else if (c !== condRaw) {
        out.condition = c;
        fixesApplied.push(`Normalized condition to '${c}' on row ${n}`);
      }
    }

    const gtinRaw = (out.gtin ?? "").trim();
    if (gtinRaw) {
      const c = checkBarcode(gtinRaw);
      if (c.status === "lost") flag("gtin", "warning", "tiktok/invalid_gtin", `gtin '${gtinRaw}' looks like scientific notation, so digits were lost. Re-export the column as text.`, "Copy the barcodes again from the original source.");
      else if (c.status === "invalid") flag("gtin", "warning", "tiktok/invalid_gtin", `gtin '${gtinRaw}' isn't a valid GTIN: it needs 8, 12, 13 or 14 digits with a correct check digit.`, "Check the barcode on the packaging, or leave gtin blank.");
      else if (c.status === "fixed" && c.value !== gtinRaw) {
        out.gtin = c.value;
        fixesApplied.push(`Cleaned gtin on row ${n}`);
      }
    }

    for (const [col, allowed] of [
      ["gender", "female, male or unisex"],
      ["age_group", "newborn, infant, toddler, kids or adult"],
    ] as const) {
      const raw = (out[col] ?? "").trim();
      if (!raw) continue;
      // Age groups are kept as written, since TikTok lists them both bare and with their ages.
      const v = col === "gender" ? GENDER[raw.toLowerCase()] : AGE_GROUP.test(raw) ? raw : undefined;
      if (!v) flag(col, "warning", col === "gender" ? "tiktok/invalid_gender" : "tiktok/invalid_age_group", `${col} must be ${allowed}. Found '${raw}'.`, "Use one of TikTok's values.");
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
        column: "sku_id",
        severity: "error",
        code: "tiktok/duplicate_id",
        message: `sku_id '${id}' is used on rows ${rowsList}.`,
        suggestion: "Give every product (and every variant) its own sku_id. TikTok ignores products whose sku_id is already used.",
        details: { id, rows: list.map((i) => i + 1) },
      });
    }
  }

  // Keep the file's own column names and order (with an id column renamed to sku_id).
  const finalRows = rowsOut.map((r) => {
    const out: CsvRow = {};
    outHeaders.forEach((h, i) => (out[h] = r[canon[i]] ?? ""));
    return out;
  });
  const originalOf = new Map(canon.map((c, i) => [c, outHeaders[i]] as const));
  for (const it of issues) it.column = originalOf.get(it.column) ?? it.column;

  return { fixedHeaders: outHeaders, fixedRows: finalRows, issues, fixesApplied };
}
