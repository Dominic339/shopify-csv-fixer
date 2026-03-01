// src/lib/validation/issueMetaEbay.ts
import type { IssueMetaMap } from "./issueMeta";

export const EBAY_ISSUE_META: IssueMetaMap = {
  "ebay/missing_required_header": {
    code: "ebay/missing_required_header",
    title: "Missing required column",
    category: "structure",
    blocking: true,
    autoFixable: false,
    explanation: "One or more required eBay File Exchange columns are missing from the header row.",
    whyPlatformCares: "eBay File Exchange needs specific column names to map fields correctly during upload.",
    howToFix: "Use an eBay File Exchange template and ensure required columns (Title, StartPrice, Quantity) are present.",
  },

  "ebay/invalid_action": {
    code: "ebay/invalid_action",
    title: "Invalid Action value",
    category: "structure",
    blocking: true,
    autoFixable: false,
    explanation: "The Action column value is not one of eBay's accepted operations.",
    whyPlatformCares: "eBay File Exchange uses Action to decide whether to Add, Revise, Delete, or End a listing. An invalid value causes the entire row to be rejected.",
    howToFix: "Use one of: Add, Revise, Delete, or End.",
  },

  "ebay/missing_title": {
    code: "ebay/missing_title",
    title: "Missing listing title",
    category: "compliance",
    blocking: true,
    autoFixable: false,
    explanation: "The Title field is required for all eBay listings.",
    whyPlatformCares: "Listings without a title cannot be published on eBay.",
    howToFix: "Provide a descriptive listing title of up to 80 characters.",
  },

  "ebay/title_too_long": {
    code: "ebay/title_too_long",
    title: "Title exceeds 80 characters",
    category: "compliance",
    blocking: true,
    autoFixable: false,
    explanation: "eBay enforces a hard 80-character limit on listing titles.",
    whyPlatformCares: "Titles over 80 characters are rejected by eBay File Exchange and cannot be uploaded.",
    howToFix: "Shorten the title to 80 characters or fewer. Focus on keywords buyers search for.",
  },

  "ebay/missing_price": {
    code: "ebay/missing_price",
    title: "Missing StartPrice",
    category: "pricing",
    blocking: true,
    autoFixable: false,
    explanation: "StartPrice is required for all eBay listings.",
    whyPlatformCares: "Listings without a price are rejected during upload.",
    howToFix: "Provide a StartPrice in decimal format (e.g., 19.99).",
  },

  "ebay/invalid_price": {
    code: "ebay/invalid_price",
    title: "Invalid StartPrice",
    category: "pricing",
    blocking: true,
    autoFixable: false,
    explanation: "StartPrice must be a valid decimal number.",
    whyPlatformCares: "Invalid price values cause listing rows to fail upload.",
    howToFix: "Use a plain decimal like 19.99 without currency symbols or commas.",
  },

  "ebay/invalid_quantity": {
    code: "ebay/invalid_quantity",
    title: "Invalid Quantity",
    category: "inventory",
    blocking: true,
    autoFixable: false,
    explanation: "Quantity must be a non-negative integer.",
    whyPlatformCares: "eBay requires a numeric quantity for all listings. Invalid values cause upload failures.",
    howToFix: "Use a whole number like 0, 1, or 10.",
  },

  "ebay/invalid_condition_id": {
    code: "ebay/invalid_condition_id",
    title: "Unrecognized ConditionID",
    category: "compliance",
    blocking: false,
    autoFixable: false,
    explanation: "The ConditionID value does not match a standard eBay condition code.",
    whyPlatformCares: "eBay uses ConditionID to display item condition to buyers. Unrecognized IDs may be rejected or cause incorrect condition display.",
    howToFix: "Use a standard eBay ConditionID: 1000=New, 2000=Manufacturer Refurbished, 2500=Like New, 3000=Good, 4000=Acceptable, 5000=For parts or not working.",
  },

  "ebay/invalid_duration": {
    code: "ebay/invalid_duration",
    title: "Invalid Duration",
    category: "compliance",
    blocking: false,
    autoFixable: false,
    explanation: "The Duration value does not match a recognized eBay listing duration format.",
    whyPlatformCares: "An unrecognized duration may default to a short auction window or cause the listing to be rejected.",
    howToFix: "Use GTC (Good Till Cancelled) for fixed-price listings or Days_N (e.g., Days_7, Days_30) for auctions.",
  },

  "ebay/invalid_format": {
    code: "ebay/invalid_format",
    title: "Invalid listing Format",
    category: "compliance",
    blocking: false,
    autoFixable: false,
    explanation: "The Format value is not a recognized eBay listing type.",
    whyPlatformCares: "The Format field tells eBay how to present the listing. An invalid value may cause the row to fail.",
    howToFix: "Use FixedPriceItem for Buy It Now listings or Chinese for auction-style listings.",
  },

  "ebay/too_many_images": {
    code: "ebay/too_many_images",
    title: "Too many images",
    category: "media",
    blocking: false,
    autoFixable: false,
    explanation: "eBay allows a maximum of 12 images per listing.",
    whyPlatformCares: "Extra images beyond the 12-image limit are silently dropped by eBay.",
    howToFix: "Reduce the PictureURL list to 12 or fewer pipe-separated URLs.",
  },

  "ebay/invalid_picture_url": {
    code: "ebay/invalid_picture_url",
    title: "Invalid picture URL",
    category: "media",
    blocking: false,
    autoFixable: false,
    explanation: "One or more picture URLs are not valid http(s) URLs.",
    whyPlatformCares: "eBay fetches images from the provided URLs at listing time. Invalid URLs result in missing listing images.",
    howToFix: "Use full https:// URLs pointing to publicly accessible images. Separate multiple URLs with pipes (|).",
  },

  "ebay/invalid_dispatch_time": {
    code: "ebay/invalid_dispatch_time",
    title: "Invalid DispatchTimeMax",
    category: "shipping",
    blocking: false,
    autoFixable: false,
    explanation: "DispatchTimeMax should be a non-negative integer representing your handling time in days.",
    whyPlatformCares: "eBay displays handling time to buyers. An invalid value may prevent the listing from uploading.",
    howToFix: "Use a whole number like 1, 2, or 3 (days to dispatch).",
  },

  "ebay/duplicate_sku": {
    code: "ebay/duplicate_sku",
    title: "Duplicate CustomLabel (SKU)",
    category: "sku",
    blocking: false,
    autoFixable: false,
    explanation: "Two or more rows share the same CustomLabel value.",
    whyPlatformCares: "Duplicate CustomLabels in an Add action can create conflicting listings. Use Revise action to update existing listings.",
    howToFix: "Ensure each listing has a unique CustomLabel, or use Action=Revise for updates to existing listings.",
  },

  "ebay/variation_specifics_mismatch": {
    code: "ebay/variation_specifics_mismatch",
    title: "Variation specifics mismatch",
    category: "variant",
    blocking: true,
    autoFixable: false,
    explanation: "VariationSpecificsName and VariationSpecificsValue must both be provided or both be empty.",
    whyPlatformCares: "eBay requires matched name/value pairs to build variation attributes. A mismatch prevents the variation from being created.",
    howToFix: "Provide both VariationSpecificsName (e.g., 'Color|Size') and VariationSpecificsValue (e.g., 'Blue|Medium') for each variation row.",
  },

  "ebay/duplicate_variation_combo": {
    code: "ebay/duplicate_variation_combo",
    title: "Duplicate variation combination",
    category: "variant",
    blocking: true,
    autoFixable: false,
    explanation: "Two or more variation rows share the same VariationSpecifics combination under the same listing.",
    whyPlatformCares: "Duplicate variation combinations will overwrite each other during upload, causing data loss.",
    howToFix: "Ensure each variation row has a unique combination of VariationSpecificsName and VariationSpecificsValue.",
  },
};
