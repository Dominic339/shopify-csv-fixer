// src/lib/validation/issueMetaWooCommerce.ts

import type { IssueMetaMap } from "./issueMeta";

export const WOO_ISSUE_META: IssueMetaMap = {
  "woocommerce/missing_required_header": {
    title: "Missing required column",
    category: "structure",
    blocking: true,
    autoFixable: false,
  },
  "woocommerce/invalid_type": {
    title: "Invalid product type",
    category: "structure",
    blocking: true,
    autoFixable: false,
  },
  "woocommerce/missing_name": {
    title: "Missing product name",
    category: "structure",
    blocking: true,
    autoFixable: false,
  },
  "woocommerce/invalid_bool": {
    title: "Invalid boolean value",
    category: "structure",
    blocking: false,
    autoFixable: true,
  },
  "woocommerce/invalid_int": {
    title: "Invalid integer",
    category: "inventory",
    blocking: false,
    autoFixable: false,
  },
  "woocommerce/invalid_visibility": {
    title: "Invalid catalog visibility",
    category: "seo",
    blocking: false,
    autoFixable: true,
  },
  "woocommerce/invalid_price": {
    title: "Invalid price",
    category: "pricing",
    blocking: false,
    autoFixable: true,
  },
  "woocommerce/invalid_image_url": {
    title: "Invalid image URL",
    category: "images",
    blocking: false,
    autoFixable: true,
  },
  "woocommerce/variation_missing_parent": {
    title: "Variation missing parent",
    category: "variants",
    blocking: true,
    autoFixable: false,
  },
  "woocommerce/variation_missing_attributes": {
    title: "Variation missing attributes",
    category: "variants",
    blocking: true,
    autoFixable: false,
  },
  "woocommerce/duplicate_variation_combo": {
    title: "Duplicate variation combo",
    category: "variants",
    blocking: true,
    autoFixable: false,
  },
};
