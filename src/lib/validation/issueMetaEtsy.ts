// src/lib/validation/issueMetaEtsy.ts

import type { IssueMetaMap } from "./issueMeta";

export const ETSY_ISSUE_META: IssueMetaMap = {
  "etsy/missing_required_header": {
    title: "Missing required column",
    category: "structure",
    blocking: true,
    autoFixable: false,
  },
  "etsy/missing_title": {
    title: "Missing title",
    category: "seo",
    blocking: true,
    autoFixable: false,
  },
  "etsy/title_too_long": {
    title: "Title too long",
    category: "seo",
    blocking: false,
    autoFixable: false,
  },
  "etsy/missing_price": {
    title: "Missing price",
    category: "pricing",
    blocking: true,
    autoFixable: false,
  },
  "etsy/invalid_price": {
    title: "Invalid price",
    category: "pricing",
    blocking: true,
    autoFixable: true,
  },
  "etsy/invalid_quantity": {
    title: "Invalid quantity",
    category: "inventory",
    blocking: true,
    autoFixable: true,
  },
  "etsy/invalid_currency": {
    title: "Invalid currency",
    category: "pricing",
    blocking: false,
    autoFixable: true,
  },
  "etsy/too_many_tags": {
    title: "Too many tags",
    category: "seo",
    blocking: false,
    autoFixable: false,
  },
  "etsy/tag_too_long": {
    title: "Tag too long",
    category: "seo",
    blocking: false,
    autoFixable: false,
  },
  "etsy/invalid_image_url": {
    title: "Invalid image URL",
    category: "images",
    blocking: false,
    autoFixable: true,
  },
};
