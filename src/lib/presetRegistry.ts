// src/lib/presetRegistry.ts
// Central registry for built-in preset format landing pages.
// Keep this small, human-readable, and stable so URLs do not change.

export type PresetCategory =
  | "Ecommerce"
  | "Marketing"
  | "CRM"
  | "Accounting"
  | "Shipping"
  | "Support";

export type PresetFormat = {
  id: string; // matches CsvFormat.id
  slug: string; // used in /formats/presets/[slug]
  name: string; // display name
  category: PresetCategory;
  shortDescription: string;
  searchKeywords: string[];
};

// IMPORTANT: keep slugs stable once published.
export const PRESET_FORMATS: PresetFormat[] = [
  {
    id: "shopify_products",
    slug: "shopify-products",
    name: "Shopify Import Optimizer",
    category: "Ecommerce",
    shortDescription:
      "Strict Shopify schema validation + safe auto-fixes for products, variants, images, pricing, inventory, and SEO.",
    searchKeywords: ["shopify csv", "shopify product csv", "shopify import csv", "fix shopify csv"],
  },
  {
    id: "woocommerce_products",
    slug: "woocommerce-products",
    name: "WooCommerce Products",
    category: "Ecommerce",
    shortDescription: "Clean WooCommerce product CSV exports and prep them for reliable import.",
    searchKeywords: ["woocommerce csv", "woocommerce product csv", "fix woocommerce csv"],
  },
  {
    id: "bigcommerce_products",
    slug: "bigcommerce-products",
    name: "BigCommerce Products",
    category: "Ecommerce",
    shortDescription: "Normalize BigCommerce product CSVs so they import cleanly without surprises.",
    searchKeywords: ["bigcommerce csv", "bigcommerce product csv", "fix bigcommerce csv"],
  },
  {
    id: "etsy_listings",
    slug: "etsy-listings",
    name: "Etsy Listings",
    category: "Ecommerce",
    shortDescription: "Fix Etsy listing CSV files and make them consistent before upload or analysis.",
    searchKeywords: ["etsy csv", "etsy listing csv", "fix etsy csv"],
  },
  {
    id: "ebay_listings",
    slug: "ebay-listings",
    name: "eBay Listings",
    category: "Ecommerce",
    shortDescription: "Clean up eBay listing CSV data for faster bulk edits and listing management.",
    searchKeywords: ["ebay csv", "ebay listing csv", "fix ebay csv"],
  },
  {
    id: "amazon_inventory_loader",
    slug: "amazon-inventory-loader",
    name: "Amazon Inventory Loader",
    category: "Ecommerce",
    shortDescription: "Normalize Amazon inventory CSV templates so uploads are less error prone.",
    searchKeywords: ["amazon inventory csv", "amazon csv", "fix amazon csv"],
  },

  {
    id: "mailchimp_contacts",
    slug: "mailchimp-contacts",
    name: "Mailchimp Contacts",
    category: "Marketing",
    shortDescription: "Clean contact CSVs for Mailchimp import (headers, blanks, formatting).",
    searchKeywords: ["mailchimp csv", "mailchimp contacts csv", "fix mailchimp csv"],
  },
  {
    id: "klaviyo_profiles",
    slug: "klaviyo-profiles",
    name: "Klaviyo Profiles",
    category: "Marketing",
    shortDescription: "Prepare profile CSVs for Klaviyo so lists import cleanly.",
    searchKeywords: ["klaviyo csv", "klaviyo profiles csv", "fix klaviyo csv"],
  },
  {
    id: "meta_custom_audience",
    slug: "meta-custom-audience",
    name: "Meta Custom Audience",
    category: "Marketing",
    shortDescription: "Format and clean customer lists for Meta/FB Custom Audiences.",
    searchKeywords: ["meta custom audience csv", "facebook custom audience csv", "fix custom audience csv"],
  },
  {
    id: "google_ads_customer_match",
    slug: "google-ads-customer-match",
    name: "Google Ads Customer Match",
    category: "Marketing",
    shortDescription: "Clean customer match lists to reduce upload errors and mismatched columns.",
    searchKeywords: ["google ads customer match csv", "customer match csv", "fix customer match csv"],
  },

  {
    id: "hubspot_contacts",
    slug: "hubspot-contacts",
    name: "HubSpot Contacts",
    category: "CRM",
    shortDescription: "Normalize HubSpot contact CSVs so field mapping is easier and cleaner.",
    searchKeywords: ["hubspot csv", "hubspot contacts csv", "fix hubspot csv"],
  },
  {
    id: "salesforce_leads",
    slug: "salesforce-leads",
    name: "Salesforce Leads",
    category: "CRM",
    shortDescription: "Clean Salesforce lead exports and prep them for import or enrichment.",
    searchKeywords: ["salesforce csv", "salesforce leads csv", "fix salesforce csv"],
  },
  {
    id: "zoho_contacts",
    slug: "zoho-contacts",
    name: "Zoho Contacts",
    category: "CRM",
    shortDescription: "Prepare Zoho contact CSVs for smooth import and consistent field values.",
    searchKeywords: ["zoho csv", "zoho contacts csv", "fix zoho csv"],
  },

  {
    id: "quickbooks_transactions",
    slug: "quickbooks-transactions",
    name: "QuickBooks Transactions",
    category: "Accounting",
    shortDescription: "Clean exported transaction CSVs for QuickBooks reconciliation and reporting.",
    searchKeywords: ["quickbooks csv", "quickbooks transactions csv", "fix quickbooks csv"],
  },
  {
    id: "xero_bank_statement",
    slug: "xero-bank-statement",
    name: "Xero Bank Statement",
    category: "Accounting",
    shortDescription: "Normalize Xero bank statement CSVs for import and categorization.",
    searchKeywords: ["xero csv", "xero bank statement csv", "fix xero csv"],
  },

  {
    id: "shipstation_orders",
    slug: "shipstation-orders",
    name: "ShipStation Orders",
    category: "Shipping",
    shortDescription: "Clean ShipStation order exports so you can reuse them reliably across tools.",
    searchKeywords: ["shipstation csv", "shipstation orders csv", "fix shipstation csv"],
  },
  {
    id: "pirate_ship_addresses",
    slug: "pirate-ship-addresses",
    name: "Pirate Ship Addresses",
    category: "Shipping",
    shortDescription: "Prepare address CSVs for Pirate Ship imports (formatting, blanks, headers).",
    searchKeywords: ["pirate ship csv", "pirate ship address csv", "fix address csv"],
  },
  {
    id: "ups_addresses",
    slug: "ups-addresses",
    name: "UPS Addresses",
    category: "Shipping",
    shortDescription: "Normalize UPS address CSV files for shipping workflows and label tools.",
    searchKeywords: ["ups csv", "ups address csv", "fix ups csv"],
  },

  {
    id: "zendesk_users",
    slug: "zendesk-users",
    name: "Zendesk Users",
    category: "Support",
    shortDescription: "Clean user/contact CSVs for Zendesk to avoid import mapping headaches.",
    searchKeywords: ["zendesk csv", "zendesk users csv", "fix zendesk csv"],
  },
  {
    id: "gorgias_contacts",
    slug: "gorgias-contacts",
    name: "Gorgias Contacts",
    category: "Support",
    shortDescription: "Prepare Gorgias contact lists for import with consistent formatting.",
    searchKeywords: ["gorgias csv", "gorgias contacts csv", "fix gorgias csv"],
  },
];

export function getPresetBySlug(slug: string) {
  return PRESET_FORMATS.find((p) => p.slug === slug) ?? null;
}

export function getPresetsByCategory() {
  const out: Record<PresetCategory, PresetFormat[]> = {
    Ecommerce: [],
    Marketing: [],
    CRM: [],
    Accounting: [],
    Shipping: [],
    Support: [],
  };

  for (const p of PRESET_FORMATS) out[p.category].push(p);
  return out;
}
