// src/lib/ebayOptimizer.ts
//
// eBay File Exchange / Seller Hub Reports upload validation.
//
// File structure (eBay's own templates):
// - The first column is the action, and its header carries the marketplace:
//   "*Action(SiteID=UK|Country=GB|Currency=GBP|Version=1193)". That header must be kept
//   exactly, so the output always uses the file's original column names and order.
// - "*" marks required columns in eBay's templates ("*Title", "*Category", ...).
// - Variation listings are a parent row (Title, Category, RelationshipDetails listing all
//   values: "Color=Blue;Red|Size=M;L") followed by child rows with Relationship=Variation,
//   RelationshipDetails for that variant ("Color=Blue|Size=M"), price, quantity and SKU.
//   Child rows have no Action and no Title.
// - Older spreadsheets use VariationSpecificsName / VariationSpecificsValue columns
//   ("Color|Size" / "Blue|M"); those are still validated.

import type { CsvFixResult, CsvIssue, CsvRow } from "@/lib/formats/types";
import { normalizeRowsSafe } from "@/lib/formats/engine";
import { isHttpUrl, parseShopifyMoney, formatShopifyMoney } from "@/lib/shopifySchema";

// eBay's basic listing template columns (US site shown; other sites change the Action metadata).
export const EBAY_LISTING_EXPECTED_HEADERS = [
  "*Action(SiteID=US|Country=US|Currency=USD|Version=1193)",
  "CustomLabel",
  "*Category",
  "*Title",
  "*ConditionID",
  "ConditionDescription",
  "*Description",
  "PicURL",
  "*Format",
  "*Duration",
  "*StartPrice",
  "BuyItNowPrice",
  "*Quantity",
  "*Location",
  "DispatchTimeMax",
  "ShippingProfileName",
  "ReturnProfileName",
  "PaymentProfileName",
];

export const EBAY_LISTING_EXAMPLE_ROW: CsvRow = {
  "*Action(SiteID=US|Country=US|Currency=USD|Version=1193)": "Add",
  CustomLabel: "SKU-12345",
  "*Category": "9355",
  "*Title": "Example Item Title for eBay Listing",
  "*ConditionID": "1000",
  ConditionDescription: "",
  "*Description": "Full description of the item including condition details.",
  PicURL: "https://example.com/images/item.jpg",
  "*Format": "FixedPrice",
  "*Duration": "GTC",
  "*StartPrice": "24.99",
  BuyItNowPrice: "",
  "*Quantity": "10",
  "*Location": "San Jose, CA",
  DispatchTimeMax: "3",
  ShippingProfileName: "Standard Shipping",
  ReturnProfileName: "30-Day Returns",
  PaymentProfileName: "eBay Payments",
};

export const EBAY_VARIATION_EXPECTED_HEADERS = [
  "*Action(SiteID=US|Country=US|Currency=USD|Version=1193)",
  "CustomLabel",
  "*Category",
  "*Title",
  "*ConditionID",
  "*Description",
  "PicURL",
  "*Format",
  "*Duration",
  "*StartPrice",
  "*Quantity",
  "Relationship",
  "RelationshipDetails",
];

export const EBAY_VARIATION_EXAMPLE_ROW: CsvRow = {
  "*Action(SiteID=US|Country=US|Currency=USD|Version=1193)": "",
  CustomLabel: "SKU-12345-BLU-M",
  "*Category": "",
  "*Title": "",
  "*ConditionID": "",
  "*Description": "",
  PicURL: "",
  "*Format": "",
  "*Duration": "",
  "*StartPrice": "24.99",
  "*Quantity": "5",
  Relationship: "Variation",
  RelationshipDetails: "Color=Blue|Size=M",
};

const VALID_ACTIONS = new Set(["add", "verifyadd", "revise", "relist", "end", "status", "delete", "addtoitemdescription"]);

// Listing formats: File Exchange names and their API equivalents.
const FORMATS: Record<string, "fixed" | "auction"> = {
  fixedprice: "fixed",
  fixedpriceitem: "fixed",
  auction: "auction",
  chinese: "auction",
};

// eBay item condition IDs (meaning varies slightly by category).
const CONDITION_IDS: Record<string, string> = {
  "1000": "New",
  "1500": "New other",
  "1750": "New with defects",
  "2000": "Certified refurbished",
  "2010": "Excellent - Refurbished",
  "2020": "Very good - Refurbished",
  "2030": "Good - Refurbished",
  "2500": "Seller refurbished",
  "2750": "Like new",
  "2990": "Pre-owned - Excellent",
  "3000": "Used",
  "3010": "Pre-owned - Fair",
  "4000": "Very good",
  "5000": "Good",
  "6000": "Acceptable",
  "7000": "For parts or not working",
};
const CONDITION_TEXT_TO_ID: Record<string, string> = {
  new: "1000",
  "brand new": "1000",
  "new other": "1500",
  "new other (see details)": "1500",
  "new with defects": "1750",
  "certified refurbished": "2000",
  "manufacturer refurbished": "2000",
  "seller refurbished": "2500",
  "like new": "2750",
  used: "3000",
  "pre-owned": "3000",
  "very good": "4000",
  good: "5000",
  acceptable: "6000",
  "for parts or not working": "7000",
  "for parts": "7000",
};

const AUCTION_DURATIONS = new Set(["days_1", "days_3", "days_5", "days_7", "days_10"]);
const MAX_PICTURES = 24;
const MAX_TITLE = 80;

/** Canonical internal names for eBay columns, keyed by normalized header text. */
const CANON: Record<string, string> = {
  action: "Action",
  customlabel: "CustomLabel",
  sku: "CustomLabel",
  seller_sku: "CustomLabel",
  "custom label": "CustomLabel",
  "custom label (sku)": "CustomLabel",
  itemid: "ItemID",
  "item id": "ItemID",
  category: "Category",
  categoryid: "Category",
  "category id": "Category",
  title: "Title",
  conditionid: "ConditionID",
  condition: "ConditionID",
  "item condition": "ConditionID",
  item_condition: "ConditionID",
  description: "Description",
  picurl: "PicURL",
  pictureurl: "PicURL",
  "image url": "PicURL",
  imageurl: "PicURL",
  format: "Format",
  "listing type": "Format",
  listing_type: "Format",
  duration: "Duration",
  "listing duration": "Duration",
  listing_duration: "Duration",
  startprice: "StartPrice",
  "start price": "StartPrice",
  price: "StartPrice",
  buyitnowprice: "BuyItNowPrice",
  "buy it now price": "BuyItNowPrice",
  quantity: "Quantity",
  qty: "Quantity",
  location: "Location",
  postalcode: "PostalCode",
  dispatchtimemax: "DispatchTimeMax",
  "dispatch time max": "DispatchTimeMax",
  "handling time": "DispatchTimeMax",
  handling_time: "DispatchTimeMax",
  endcode: "EndCode",
  relationship: "Relationship",
  relationshipdetails: "RelationshipDetails",
  variationspecificsname: "VariationSpecificsName",
  "variation specifics name": "VariationSpecificsName",
  variationspecificsvalue: "VariationSpecificsValue",
  "variation specifics value": "VariationSpecificsValue",
  variationpictureurl: "VariationPictureURL",
  "variation picture url": "VariationPictureURL",
};

function canonicalName(header: string): string | null {
  const key = header
    .trim()
    .replace(/^\*/, "")
    .replace(/\s*\(.*\)\s*$/, "") // "*Action(SiteID=...)" → "Action"
    .toLowerCase();
  return CANON[key] ?? null;
}

function isEmpty(v: string | undefined) {
  return !String(v ?? "").trim();
}

/** "Color=Blue;Red|Size=M" → Map(color → ["Blue","Red"], size → ["M"]) */
function parseRelationshipDetails(raw: string): Map<string, { name: string; values: string[] }> | null {
  const out = new Map<string, { name: string; values: string[] }>();
  for (const part of raw.split("|").map((s) => s.trim()).filter(Boolean)) {
    const eq = part.indexOf("=");
    if (eq <= 0) return null;
    const name = part.slice(0, eq).trim();
    const values = part
      .slice(eq + 1)
      .split(";")
      .map((v) => v.trim())
      .filter(Boolean);
    if (!name || !values.length) return null;
    out.set(name.toLowerCase(), { name, values });
  }
  return out.size ? out : null;
}

type Mode = "listings" | "variations";

function validateEbay(headers: string[], rows: CsvRow[], mode: Mode): CsvFixResult {
  const { fixedRows, fixesApplied } = normalizeRowsSafe(headers, rows);
  const issues: CsvIssue[] = [];

  // canonical name → the file's own header for it (first match wins)
  const col = new Map<string, string>();
  for (const h of headers) {
    const c = canonicalName(h);
    if (c && !col.has(c)) col.set(c, h);
  }
  const has = (c: string) => col.has(c);
  const get = (r: CsvRow, c: string) => (col.has(c) ? String(r[col.get(c)!] ?? "") : "");
  const set = (r: CsvRow, c: string, v: string) => {
    if (col.has(c)) r[col.get(c)!] = v;
  };
  const header = (c: string) => col.get(c) ?? c;
  const push = (issue: Omit<CsvIssue, "column"> & { column: string }) =>
    issues.push({ ...issue, column: header(issue.column) });

  if (!has("Action")) {
    issues.push({
      rowIndex: -1,
      column: "Action",
      severity: "warning",
      code: "ebay/missing_action_column",
      message: "No Action column found. eBay uploads start with an Action column, e.g. *Action(SiteID=US|Country=US|Currency=USD|Version=1193).",
      suggestion: "Download a template from Seller Hub › Reports › Uploads and keep its first column; rows are validated as new listings (Add).",
    });
  }

  const skuRows = new Map<string, number[]>();
  // Current variation parent (for child rows that follow it).
  let parent: { row: number; details: Map<string, { name: string; values: string[] }> | null; combos: Map<string, number[]> } | null =
    null;

  for (let i = 0; i < fixedRows.length; i++) {
    const r = fixedRows[i];
    const row = i + 1;

    const isChild = get(r, "Relationship").trim().toLowerCase() === "variation";
    const actionRaw = get(r, "Action").trim();
    const action = actionRaw.toLowerCase();

    // Action: valid value, normalized casing
    if (actionRaw) {
      if (!VALID_ACTIONS.has(action)) {
        push({
          rowIndex: i,
          column: "Action",
          severity: "error",
          code: "ebay/invalid_action",
          message: `Invalid Action '${actionRaw}'.`,
          suggestion: "Use Add, Revise, Relist, End, VerifyAdd, or Status.",
        });
      } else {
        const proper =
          { verifyadd: "VerifyAdd", addtoitemdescription: "AddToItemDescription" }[action] ??
          action.charAt(0).toUpperCase() + action.slice(1);
        if (proper !== actionRaw) {
          set(r, "Action", proper);
          fixesApplied.push(`Normalized Action to '${proper}' on row ${row}`);
        }
      }
    } else if (has("Action") && !isChild) {
      push({
        rowIndex: i,
        column: "Action",
        severity: "error",
        code: "ebay/missing_action",
        message: "Action is blank. Every listing row needs an Action (only variation rows leave it blank).",
        suggestion: "Set Action to Add, Revise, Relist, or End.",
      });
    }

    const isAdd = !isChild && (!actionRaw || action === "add" || action === "verifyadd");
    const needsItemId = !isChild && (action === "end" || action === "relist");
    const isParent = isAdd && !isEmpty(get(r, "RelationshipDetails"));

    if (needsItemId && isEmpty(get(r, "ItemID"))) {
      push({
        rowIndex: i,
        column: "ItemID",
        severity: "error",
        code: "ebay/missing_item_id",
        message: `${actionRaw} needs the ItemID of the existing listing.`,
        suggestion: "Add an ItemID column with the eBay item number.",
      });
    }
    if (action === "revise" && isEmpty(get(r, "ItemID")) && isEmpty(get(r, "CustomLabel"))) {
      push({
        rowIndex: i,
        column: "ItemID",
        severity: "error",
        code: "ebay/missing_item_id",
        message: "Revise needs the ItemID (or the CustomLabel/SKU) of the listing to change.",
        suggestion: "Add the eBay item number in ItemID.",
      });
    }
    if (action === "end" && has("EndCode") && isEmpty(get(r, "EndCode"))) {
      push({
        rowIndex: i,
        column: "EndCode",
        severity: "warning",
        code: "ebay/missing_end_code",
        message: "End rows should give an EndCode.",
        suggestion: "Use NotAvailable, LostOrBroken, Incorrect, or OtherListingError.",
      });
    }

    // Title: required on new listings; max 80 characters wherever given
    const title = get(r, "Title").trim();
    if (isAdd && !title) {
      push({
        rowIndex: i,
        column: "Title",
        severity: "error",
        code: "ebay/missing_title",
        message: "Missing listing Title.",
        suggestion: "Provide a descriptive title for the listing.",
      });
    } else if (title.length > MAX_TITLE) {
      push({
        rowIndex: i,
        column: "Title",
        severity: "error",
        code: "ebay/title_too_long",
        message: `Title is ${title.length} characters. eBay allows a maximum of ${MAX_TITLE}.`,
        suggestion: `Shorten the title to ${MAX_TITLE} characters or fewer.`,
        details: { length: title.length, max: MAX_TITLE },
      });
    }

    if (isAdd && has("Category") && isEmpty(get(r, "Category"))) {
      push({
        rowIndex: i,
        column: "Category",
        severity: "error",
        code: "ebay/missing_category_id",
        message: "Category is blank. New listings need an eBay category number.",
        suggestion: "Use the numeric category ID from eBay's category tree (e.g. 15687 for men's T-shirts).",
      });
    }
    const category = get(r, "Category").trim();
    if (category && !/^\d+$/.test(category)) {
      push({
        rowIndex: i,
        column: "Category",
        severity: "error",
        code: "ebay/invalid_category_id",
        message: `Category '${category}' should be a numeric eBay category ID.`,
        suggestion: "Use the category number, not its name.",
      });
    }

    // Prices: StartPrice is on single listings and on each variation, not on the parent.
    for (const c of ["StartPrice", "BuyItNowPrice"]) {
      const raw = get(r, c);
      if (isEmpty(raw)) continue;
      const n = parseShopifyMoney(raw);
      if (n == null || n < 0) {
        push({
          rowIndex: i,
          column: c,
          severity: "error",
          code: "ebay/invalid_price",
          message: `${c} should be a decimal number. Found '${raw}'.`,
          suggestion: "Use a plain decimal like 19.99 (no currency symbols).",
        });
      } else if (formatShopifyMoney(n) !== raw.trim()) {
        set(r, c, formatShopifyMoney(n));
        fixesApplied.push(`Normalized ${c} to '${formatShopifyMoney(n)}' on row ${row}`);
      }
    }
    if ((isAdd && !isParent) || isChild) {
      if (has("StartPrice") && isEmpty(get(r, "StartPrice"))) {
        push({
          rowIndex: i,
          column: "StartPrice",
          severity: "error",
          code: "ebay/missing_price",
          message: isChild ? "Variation is missing its StartPrice." : "Missing StartPrice.",
          suggestion: "Provide a price.",
        });
      }
    }

    // Quantity: non-negative whole number
    const qRaw = get(r, "Quantity").trim();
    if (qRaw) {
      const q = parseShopifyMoney(qRaw);
      if (q == null || !Number.isInteger(q) || q < 0) {
        push({
          rowIndex: i,
          column: "Quantity",
          severity: "error",
          code: "ebay/invalid_quantity",
          message: `Quantity should be a whole number of 0 or more. Found '${qRaw}'.`,
          suggestion: "Use a whole number like 0, 1, 10.",
        });
      } else if (String(q) !== qRaw) {
        set(r, "Quantity", String(q));
        fixesApplied.push(`Normalized Quantity to '${q}' on row ${row}`);
      }
    }

    // ConditionID: accept condition names and convert them
    const cRaw = get(r, "ConditionID").trim();
    if (cRaw && !CONDITION_IDS[cRaw]) {
      const id = CONDITION_TEXT_TO_ID[cRaw.toLowerCase()];
      if (id) {
        set(r, "ConditionID", id);
        fixesApplied.push(`Converted condition '${cRaw}' to ConditionID ${id} on row ${row}`);
      } else {
        push({
          rowIndex: i,
          column: "ConditionID",
          severity: "warning",
          code: "ebay/invalid_condition_id",
          message: `ConditionID '${cRaw}' is not a standard eBay condition.`,
          suggestion: "Use a condition ID such as 1000 (New), 3000 (Used), or 7000 (For parts or not working); allowed IDs vary by category.",
        });
      }
    } else if (isAdd && has("ConditionID") && !cRaw) {
      push({
        rowIndex: i,
        column: "ConditionID",
        severity: "warning",
        code: "ebay/missing_condition",
        message: "ConditionID is blank. Most eBay categories require an item condition.",
        suggestion: "Set a ConditionID such as 1000 (New) or 3000 (Used).",
      });
    }

    // Format + Duration
    const fRaw = get(r, "Format").trim();
    const kind = fRaw ? FORMATS[fRaw.toLowerCase()] : undefined;
    if (fRaw && !kind) {
      push({
        rowIndex: i,
        column: "Format",
        severity: "error",
        code: "ebay/invalid_format",
        message: `Format '${fRaw}' is not an eBay listing format.`,
        suggestion: "Use FixedPrice (Buy It Now) or Auction.",
      });
    }
    const dRaw = get(r, "Duration").trim();
    if (dRaw) {
      const d = dRaw.toLowerCase();
      const known = d === "gtc" || AUCTION_DURATIONS.has(d) || /^days_\d+$/.test(d);
      if (!known) {
        push({
          rowIndex: i,
          column: "Duration",
          severity: "error",
          code: "ebay/invalid_duration",
          message: `Duration '${dRaw}' is not a recognised eBay duration.`,
          suggestion: "Use GTC for fixed-price listings, or Days_1/3/5/7/10 for auctions.",
        });
      } else if (kind === "fixed" && d !== "gtc") {
        push({
          rowIndex: i,
          column: "Duration",
          severity: "warning",
          code: "ebay/fixed_price_not_gtc",
          message: `Fixed-price listings run Good 'Til Cancelled; '${dRaw}' will be changed to GTC by eBay.`,
          suggestion: "Set Duration to GTC.",
        });
      } else if (kind === "auction" && !AUCTION_DURATIONS.has(d)) {
        push({
          rowIndex: i,
          column: "Duration",
          severity: "error",
          code: "ebay/invalid_duration",
          message: `Auctions run for 1, 3, 5, 7, or 10 days ('${dRaw}' is not allowed).`,
          suggestion: "Use Days_1, Days_3, Days_5, Days_7, or Days_10.",
        });
      }
    }

    // Pictures: up to 24 URLs separated by "|"
    for (const c of ["PicURL", "VariationPictureURL"]) {
      const raw = get(r, c);
      if (isEmpty(raw)) continue;
      const urls = raw.split("|").map((s) => s.trim()).filter(Boolean);
      if (urls.length > MAX_PICTURES) {
        push({
          rowIndex: i,
          column: c,
          severity: "warning",
          code: "ebay/too_many_images",
          message: `eBay allows up to ${MAX_PICTURES} pictures per listing. Found ${urls.length}.`,
          suggestion: `Reduce to ${MAX_PICTURES} or fewer pictures.`,
          details: { count: urls.length },
        });
      }
      const bad = urls.filter((u) => !isHttpUrl(u));
      if (bad.length) {
        push({
          rowIndex: i,
          column: c,
          severity: "warning",
          code: "ebay/invalid_picture_url",
          message: `One or more picture URLs are invalid: ${bad.slice(0, 3).join(", ")}${bad.length > 3 ? "…" : ""}`,
          suggestion: "Use full https:// URLs separated by |.",
          details: { badUrls: bad },
        });
      }
      const cleaned = urls.join("|");
      if (cleaned !== raw.trim()) {
        set(r, c, cleaned);
        fixesApplied.push(`Cleaned ${c} list on row ${row}`);
      }
    }

    const dtm = get(r, "DispatchTimeMax").trim();
    if (dtm && !/^\d+$/.test(dtm)) {
      push({
        rowIndex: i,
        column: "DispatchTimeMax",
        severity: "warning",
        code: "ebay/invalid_dispatch_time",
        message: `DispatchTimeMax should be a whole number of days. Found '${dtm}'.`,
        suggestion: "Use a whole number (e.g., 1, 3, 5) representing handling days.",
      });
    }

    // Variation parent / child structure (Relationship columns)
    if (isParent) {
      const details = parseRelationshipDetails(get(r, "RelationshipDetails"));
      if (!details) {
        push({
          rowIndex: i,
          column: "RelationshipDetails",
          severity: "error",
          code: "ebay/invalid_relationship_details",
          message: `RelationshipDetails '${get(r, "RelationshipDetails")}' is not in the form Color=Blue;Red|Size=M;L.`,
          suggestion: "List each variation name with all its values: Name=Value1;Value2, separated by |.",
        });
      }
      parent = { row: i, details, combos: new Map() };
    } else if (isChild) {
      const raw = get(r, "RelationshipDetails").trim();
      const details = raw ? parseRelationshipDetails(raw) : null;
      if (!parent) {
        push({
          rowIndex: i,
          column: "Relationship",
          severity: "error",
          code: "ebay/variation_without_parent",
          message: "Variation row does not follow a parent listing row.",
          suggestion: "Put variation rows directly below their parent row (the row with Action=Add and RelationshipDetails).",
        });
      } else if (!details || [...details.values()].some((d) => d.values.length !== 1)) {
        push({
          rowIndex: i,
          column: "RelationshipDetails",
          severity: "error",
          code: "ebay/invalid_relationship_details",
          message: `Variation RelationshipDetails '${raw}' should give one value per name, e.g. Color=Blue|Size=M.`,
          suggestion: "Use Name=Value pairs separated by |.",
        });
      } else {
        if (parent.details) {
          for (const [k, d] of details) {
            const declared = parent.details.get(k);
            if (!declared || !declared.values.some((v) => v.toLowerCase() === d.values[0].toLowerCase())) {
              push({
                rowIndex: i,
                column: "RelationshipDetails",
                severity: "error",
                code: "ebay/variation_value_not_in_parent",
                message: `${d.name}=${d.values[0]} is not listed in the parent row's RelationshipDetails (row ${parent.row + 1}).`,
                suggestion: "Add the value to the parent row, or correct the variation.",
              });
            }
          }
        }
        const key = [...details.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, d]) => `${k}=${d.values[0].toLowerCase()}`)
          .join("|");
        const arr = parent.combos.get(key) ?? [];
        arr.push(i);
        parent.combos.set(key, arr);
        if (arr.length === 2) {
          for (const idx of arr) {
            push({
              rowIndex: idx,
              column: "RelationshipDetails",
              severity: "error",
              code: "ebay/duplicate_variation_combo",
              message: `Two variations of the listing on row ${parent.row + 1} have the same options (${raw}).`,
              suggestion: "Each variation needs a unique combination of values.",
            });
          }
        } else if (arr.length > 2) {
          push({
            rowIndex: i,
            column: "RelationshipDetails",
            severity: "error",
            code: "ebay/duplicate_variation_combo",
            message: `Two variations of the listing on row ${parent.row + 1} have the same options (${raw}).`,
            suggestion: "Each variation needs a unique combination of values.",
          });
        }
      }
    } else if (!isEmpty(actionRaw)) {
      parent = null;
    }

    // Older VariationSpecificsName / VariationSpecificsValue columns
    const vsName = get(r, "VariationSpecificsName").trim();
    const vsValue = get(r, "VariationSpecificsValue").trim();
    if ((vsName && !vsValue) || (!vsName && vsValue)) {
      push({
        rowIndex: i,
        column: "VariationSpecificsValue",
        severity: "error",
        code: "ebay/variation_specifics_mismatch",
        message: "VariationSpecificsName and VariationSpecificsValue must both be provided or both empty.",
        suggestion: "Provide both for each variation row.",
      });
    } else if (vsName && vsName.split("|").length !== vsValue.split("|").length) {
      push({
        rowIndex: i,
        column: "VariationSpecificsValue",
        severity: "error",
        code: "ebay/variation_specifics_mismatch",
        message: `VariationSpecificsName has ${vsName.split("|").length} names but VariationSpecificsValue has ${vsValue.split("|").length} values.`,
        suggestion: "Give one value per name, separated by |.",
      });
    }

    const sku = get(r, "CustomLabel").trim();
    if (sku) {
      const arr = skuRows.get(sku) ?? [];
      arr.push(i);
      skuRows.set(sku, arr);
    }
  }

  // Older column style: duplicate combos per listing
  if (has("VariationSpecificsName")) {
    const seen = new Map<string, number[]>();
    fixedRows.forEach((r, i) => {
      const n = get(r, "VariationSpecificsName").trim().toLowerCase();
      const v = get(r, "VariationSpecificsValue").trim().toLowerCase();
      if (!n || !v) return;
      const key = `${get(r, "Title").trim().toLowerCase()}||${n}||${v}`;
      seen.set(key, [...(seen.get(key) ?? []), i]);
    });
    for (const idxs of seen.values()) {
      if (idxs.length < 2) continue;
      for (const idx of idxs) {
        push({
          rowIndex: idx,
          column: "VariationSpecificsValue",
          severity: "error",
          code: "ebay/duplicate_variation_combo",
          message: `Duplicate variation specifics combination (rows ${idxs.map((x) => x + 1).join(", ")}).`,
          suggestion: "Each variation under the same listing must have a unique combination.",
        });
      }
    }
  }

  for (const [sku, idxs] of skuRows.entries()) {
    if (idxs.length < 2) continue;
    const rows1b = idxs.map((x) => x + 1);
    for (const idx of idxs) {
      push({
        rowIndex: idx,
        column: "CustomLabel",
        severity: "warning",
        code: "ebay/duplicate_sku",
        message: `Duplicate CustomLabel (SKU) '${sku}' found on rows ${rows1b.join(", ")}.`,
        suggestion: "Give each listing and variation its own CustomLabel.",
        details: { sku, rows: rows1b },
      });
    }
  }

  if (mode === "variations" && !has("Relationship") && !has("VariationSpecificsName")) {
    issues.push({
      rowIndex: -1,
      column: "Relationship",
      severity: "error",
      code: "ebay/missing_required_header",
      message: "No variation columns found. eBay variation files use Relationship and RelationshipDetails columns.",
      suggestion: "Add Relationship and RelationshipDetails, with a parent row followed by Relationship=Variation rows.",
    });
  }

  // Output keeps the file's own columns and header text (the Action header carries the
  // eBay site and currency, and must not be renamed).
  return { fixedHeaders: [...headers], fixedRows, issues, fixesApplied };
}

export function validateAndFixEbayListings(headers: string[], rows: CsvRow[]): CsvFixResult {
  return validateEbay(headers, rows, "listings");
}

export function validateAndFixEbayVariations(headers: string[], rows: CsvRow[]): CsvFixResult {
  return validateEbay(headers, rows, "variations");
}

export function describeEbayCondition(id: string): string | undefined {
  return CONDITION_IDS[id];
}
