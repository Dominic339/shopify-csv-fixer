// src/lib/presets.ts

export type PresetCategory =
  | "Ecommerce"
  | "CRM"
  | "Marketing"
  | "Accounting"
  | "Shipping"
  | "Support";

export type PresetFormat = {
  // This is the URL id used for /presets/[id]
  id: string;

  // If you ever rename ids later, keep backwards compatibility here
  aliases?: string[];

  name: string;
  description: string;
  category: PresetCategory;

  // This must match the CsvFormat id used in your app format engine
  // (the same ids you show in your AppClient pills)
  formatId: string;
};

// 20 Presets (excluding general_csv)
export const PRESET_FORMATS: PresetFormat[] = [
  // Ecommerce
  {
    id: "shopify_products",
    aliases: ["shopify", "shopify-product-csv", "shopify_products_csv"],
    name: "Shopify Products",
    description: "Fix common Shopify product import problems (handles, options, pricing, inventory).",
    category: "Ecommerce",
    formatId: "shopify_products",
  },
  {
    id: "woocommerce_products",
    aliases: ["woocommerce", "woo_products"],
    name: "WooCommerce Products",
    description: "Normalize WooCommerce product imports and flag missing required fields.",
    category: "Ecommerce",
    formatId: "woocommerce_products",
  },
  {
    id: "bigcommerce_products",
    aliases: ["bigcommerce"],
    name: "BigCommerce Products",
    description: "Map and clean product columns for BigCommerce imports and catch required-field issues.",
    category: "Ecommerce",
    formatId: "bigcommerce_products",
  },
  {
    id: "etsy_listings",
    aliases: ["etsy"],
    name: "Etsy Listings",
    description: "Normalize Etsy listing exports and flag common formatting issues.",
    category: "Ecommerce",
    formatId: "etsy_listings",
  },
  {
    id: "ebay_listings",
    aliases: ["ebay"],
    name: "eBay Listings",
    description: "Clean a simplified eBay listing template and flag common problems before import.",
    category: "Ecommerce",
    formatId: "ebay_listings",
  },
  {
    id: "amazon_inventory_loader",
    aliases: ["amazon", "amazon_inventory"],
    name: "Amazon Inventory Loader",
    description: "Build a simplified Amazon inventory template and flag missing essentials.",
    category: "Ecommerce",
    formatId: "amazon_inventory_loader",
  },

  // Marketing
  {
    id: "mailchimp_contacts",
    aliases: ["mailchimp"],
    name: "Mailchimp Contacts",
    description: "Clean contact imports and flag invalid emails and required fields.",
    category: "Marketing",
    formatId: "mailchimp_contacts",
  },
  {
    id: "klaviyo_profiles",
    aliases: ["klaviyo"],
    name: "Klaviyo Profiles",
    description: "Normalize profile exports and reduce import errors caused by formatting and blanks.",
    category: "Marketing",
    formatId: "klaviyo_profiles",
  },
  {
    id: "meta_custom_audience",
    aliases: ["meta_audience", "facebook_custom_audience", "facebook_audience"],
    name: "Meta Custom Audience",
    description: "Prepare customer match style audiences and flag invalid identifiers.",
    category: "Marketing",
    formatId: "meta_custom_audience",
  },
  {
    id: "google_ads_customer_match",
    aliases: ["google_ads", "customer_match", "google_customer_match"],
    name: "Google Ads Customer Match",
    description: "Normalize customer match uploads and flag invalid / missing identifiers.",
    category: "Marketing",
    formatId: "google_ads_customer_match",
  },

  // CRM
  {
    id: "hubspot_contacts",
    aliases: ["hubspot"],
    name: "HubSpot Contacts",
    description: "Map fields for HubSpot contact imports and flag invalid emails.",
    category: "CRM",
    formatId: "hubspot_contacts",
  },
  {
    id: "salesforce_leads",
    aliases: ["salesforce"],
    name: "Salesforce Leads",
    description: "Create a simple Salesforce lead import template and flag invalid emails.",
    category: "CRM",
    formatId: "salesforce_leads",
  },
  {
    id: "zoho_contacts",
    aliases: ["zoho"],
    name: "Zoho Contacts",
    description: "Maps contacts for Zoho imports and flags invalid emails.",
    category: "CRM",
    formatId: "zoho_contacts",
  },

  // Accounting
  {
    id: "quickbooks_transactions",
    aliases: ["quickbooks", "qb_transactions"],
    name: "QuickBooks Transactions",
    description: "Build a basic transaction import template and flag non-numeric amounts.",
    category: "Accounting",
    formatId: "quickbooks_transactions",
  },
  {
    id: "xero_bank_statement",
    aliases: ["xero", "xero_statement"],
    name: "Xero Bank Statement",
    description: "Creates a simple bank statement import template and flags invalid amounts.",
    category: "Accounting",
    formatId: "xero_bank_statement",
  },

  // Shipping
  {
    id: "shipstation_orders",
    aliases: ["shipstation"],
    name: "ShipStation Orders",
    description: "Clean ShipStation order imports and normalize common fields.",
    category: "Shipping",
    formatId: "shipstation_orders",
  },
  {
    id: "pirate_ship_addresses",
    aliases: ["pirateship", "pirate_ship", "pirate-ship-addresses"],
    name: "Pirate Ship Addresses",
    description: "Normalize address imports and flag missing pieces that break label creation.",
    category: "Shipping",
    formatId: "pirate_ship_addresses",
  },
  {
    id: "ups_address_import",
    // This directly fixes your screenshot case:
    aliases: ["ups_addresses", "ups-addresses", "ups_address", "ups"],
    name: "UPS Address Import",
    description: "Standardize address fields and flag missing required columns for UPS imports.",
    category: "Shipping",
    formatId: "ups_address_import",
  },

  // Support
  {
    id: "zendesk_users",
    aliases: ["zendesk"],
    name: "Zendesk Users",
    description: "Normalize support user imports and flag missing or invalid values.",
    category: "Support",
    formatId: "zendesk_users",
  },
  {
    id: "gorgias_contacts",
    aliases: ["gorgias"],
    name: "Gorgias Contacts",
    description: "Clean Gorgias contact exports and reduce import failures caused by formatting.",
    category: "Support",
    formatId: "gorgias_contacts",
  },
];

export function getPresetFormats(): PresetFormat[] {
  return PRESET_FORMATS.slice();
}

export function getPresetById(id: string): PresetFormat | undefined {
  const needle = (id ?? "").trim().toLowerCase();

  // Direct id match
  const direct = PRESET_FORMATS.find((p) => p.id.toLowerCase() === needle);
  if (direct) return direct;

  // Alias match
  const aliasMatch = PRESET_FORMATS.find((p) =>
    (p.aliases ?? []).some((a) => a.toLowerCase() === needle)
  );
  if (aliasMatch) return aliasMatch;

  // Fuzzy: treat - and _ as the same for safety
  const normalized = needle.replace(/-/g, "_");
  const fuzzy = PRESET_FORMATS.find((p) => {
    const pid = p.id.toLowerCase().replace(/-/g, "_");
    if (pid === normalized) return true;

    return (p.aliases ?? []).some((a) => a.toLowerCase().replace(/-/g, "_") === normalized);
  });

  return fuzzy;
}

export function groupPresetsByCategory(presets: PresetFormat[]) {
  const map = new Map<string, PresetFormat[]>();

  for (const p of presets) {
    const key = p.category ?? "Other";
    const arr = map.get(key) ?? [];
    arr.push(p);
    map.set(key, arr);
  }

  const categories = Array.from(map.keys());

  // A stable category order
  const order: PresetCategory[] = ["Ecommerce", "CRM", "Marketing", "Accounting", "Shipping", "Support"];
  categories.sort((a, b) => {
    const ai = order.indexOf(a as PresetCategory);
    const bi = order.indexOf(b as PresetCategory);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  for (const [k, arr] of map) {
    arr.sort((a, b) => a.name.localeCompare(b.name));
    map.set(k, arr);
  }

  return { categories, map };
}
