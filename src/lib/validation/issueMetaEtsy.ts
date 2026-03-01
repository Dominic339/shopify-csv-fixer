// src/lib/validation/issueMetaEtsy.ts
import type { IssueMetaMap } from "./issueMeta";

export const ETSY_ISSUE_META: IssueMetaMap = {
  "etsy/missing_required_header": {
    code: "etsy/missing_required_header",
    title: "Missing required column",
    category: "structure",
    blocking: true,
    autoFixable: false,
    explanation: "One or more required Etsy bulk listing columns are missing.",
    whyPlatformCares: "Etsy's importer needs exact headers to map listing fields correctly.",
    howToFix: "Export a fresh Etsy bulk listing CSV and ensure required headers are present and unchanged.",
  },

  "etsy/invalid_price": {
    code: "etsy/invalid_price",
    title: "Invalid price",
    category: "pricing",
    blocking: true,
    autoFixable: false,
    explanation: "Price must be a valid number.",
    whyPlatformCares: "Invalid prices can cause listing rejection.",
    howToFix: "Use numeric values like 19.99 (no currency symbols).",
  },

  "etsy/title_too_long": {
    code: "etsy/title_too_long",
    title: "Title too long",
    category: "compliance",
    blocking: false,
    autoFixable: true,
    explanation: "Etsy titles have a maximum length.",
    whyPlatformCares: "Overlong titles may be truncated or rejected depending on the importer.",
    howToFix: "Shorten the title (we can safely trim to the maximum length).",
  },

  "etsy/tags_too_many": {
    code: "etsy/tags_too_many",
    title: "Too many tags",
    category: "tags",
    blocking: false,
    autoFixable: true,
    explanation: "Etsy listings support up to 13 tags.",
    whyPlatformCares: "Over-limit tags are ignored and reduce search optimization.",
    howToFix: "Keep the best 13 tags (we can automatically limit to 13).",
  },

  // Emitted by optimizer as etsy/too_many_tags (matches the code used in etsyOptimizer.ts)
  "etsy/too_many_tags": {
    code: "etsy/too_many_tags",
    title: "Too many tags",
    category: "tags",
    blocking: false,
    autoFixable: true,
    explanation: "Etsy listings support up to 13 tags.",
    whyPlatformCares: "Over-limit tags are ignored and reduce search optimization.",
    howToFix: "Keep the best 13 tags (we can automatically limit to 13).",
  },

  "etsy/tag_too_long": {
    code: "etsy/tag_too_long",
    title: "Tag exceeds 20 characters",
    category: "tags",
    blocking: false,
    autoFixable: false,
    explanation: "Etsy limits each tag to a maximum of 20 characters.",
    whyPlatformCares: "Tags exceeding 20 characters are rejected by Etsy's tag input.",
    howToFix: "Shorten the offending tags to 20 characters or fewer.",
  },

  "etsy/missing_title": {
    code: "etsy/missing_title",
    title: "Missing listing title",
    category: "compliance",
    blocking: true,
    autoFixable: false,
    explanation: "A listing title is required for all Etsy listings.",
    whyPlatformCares: "Listings without a title cannot be published or imported.",
    howToFix: "Provide a descriptive title (up to 140 characters).",
  },

  "etsy/missing_price": {
    code: "etsy/missing_price",
    title: "Missing price",
    category: "pricing",
    blocking: true,
    autoFixable: false,
    explanation: "A price is required for all Etsy listings.",
    whyPlatformCares: "Listings without a price cannot be published.",
    howToFix: "Provide a listing price as a plain decimal (e.g., 19.99).",
  },

  "etsy/invalid_quantity": {
    code: "etsy/invalid_quantity",
    title: "Invalid quantity",
    category: "inventory",
    blocking: true,
    autoFixable: false,
    explanation: "Quantity must be a non-negative whole number.",
    whyPlatformCares: "Invalid quantity values cause listing import or publish failures.",
    howToFix: "Use a whole number like 0, 1, or 10.",
  },

  "etsy/invalid_currency": {
    code: "etsy/invalid_currency",
    title: "Invalid currency code",
    category: "compliance",
    blocking: false,
    autoFixable: true,
    explanation: "Currency must be a valid 3-letter ISO 4217 code (e.g., USD, GBP, EUR).",
    whyPlatformCares: "An invalid currency code may cause listing import failures or incorrect price display.",
    howToFix: "Use a standard 3-letter currency code (we can auto-uppercase the value).",
  },

  "etsy/invalid_image_url": {
    code: "etsy/invalid_image_url",
    title: "Invalid image URL",
    category: "media",
    blocking: false,
    autoFixable: false,
    explanation: "One or more image URLs are not valid http(s) URLs.",
    whyPlatformCares: "Etsy cannot fetch images from invalid URLs, resulting in listings with no photos.",
    howToFix: "Use full https:// URLs pointing to publicly accessible images, separated by commas.",
  },

  "etsy/duplicate_tags": {
    code: "etsy/duplicate_tags",
    title: "Duplicate tags",
    category: "tags",
    blocking: false,
    autoFixable: true,
    explanation: "Duplicate tags waste limited tag slots.",
    whyPlatformCares: "Tag duplication reduces discoverability.",
    howToFix: "Remove duplicates (we can automatically deduplicate while preserving order).",
  },

  "etsy/missing_shipping_profile": {
    code: "etsy/missing_shipping_profile",
    title: "Missing shipping profile",
    category: "shipping",
    blocking: true,
    autoFixable: false,
    explanation: "Shipping profile (or equivalent shipping fields) is required to publish.",
    whyPlatformCares: "Listings without shipping configuration cannot be published.",
    howToFix: "Provide a valid shipping profile id/name or the required shipping fields used by your export.",
  },

  "etsy/duplicate_listing_id": {
    code: "etsy/duplicate_listing_id",
    title: "Duplicate listing id risk",
    category: "compliance",
    blocking: false,
    autoFixable: false,
    explanation: "Two or more rows share the same Listing ID.",
    whyPlatformCares: "Duplicate IDs can overwrite existing listings instead of creating new ones.",
    howToFix: "Ensure Listing ID is unique when creating new listings, or intentionally set it when updating existing listings.",
  },

  "etsy/duplicate_sku": {
    code: "etsy/duplicate_sku",
    title: "Duplicate SKU risk",
    category: "sku",
    blocking: false,
    autoFixable: false,
    explanation: "Two or more listings share the same SKU.",
    whyPlatformCares: "Duplicate SKUs can create confusion for inventory and integrations.",
    howToFix: "Make SKUs unique where possible.",
  },

  "etsy/missing_required_field": {
    code: "etsy/missing_required_field",
    title: "Missing required field",
    category: "compliance",
    blocking: true,
    autoFixable: false,
    explanation: "A required Etsy field is missing.",
    whyPlatformCares: "Missing required fields cause listing rejection.",
    howToFix: "Fill the missing required field as indicated by the issue details.",
  },

  "etsy/unknown_header": {
    code: "etsy/unknown_header",
    title: "Unknown column",
    category: "structure",
    blocking: false,
    autoFixable: false,
    explanation: "This column is not recognized by the Etsy importer.",
    whyPlatformCares: "Unknown columns are ignored and can hide data issues.",
    howToFix: "Remove the column or rename it to a supported Etsy header.",
  },
};
