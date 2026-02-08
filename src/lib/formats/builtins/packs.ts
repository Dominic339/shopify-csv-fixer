import type { CsvFormat, CsvFixResult, CsvIssue, CsvRow } from "../types";

type FormatSpec = {
  id: string;
  name: string;
  description: string;
  category: string;
  expectedHeaders: string[];
  requiredHeaders: string[];
  // Optional light validation
  emailHeaders?: string[];
  numericHeaders?: string[];
};

function normHeader(s: string) {
  return s.trim().toLowerCase();
}

function buildSimpleFormat(spec: FormatSpec): CsvFormat {
  return {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    category: spec.category,
    source: "builtin",
    apply: (headers: string[], rows: CsvRow[]): CsvFixResult => {
      // NOTE: Universal cleanup runs in the engine for ALL formats.
      // Here we only do mapping to expected headers + lightweight validation.

      const inHeaders = headers;
      const inRows = rows;

      // Map expected headers to actual headers (case-insensitive match)
      const actualByNorm = new Map<string, string>();
      for (const h of inHeaders) actualByNorm.set(normHeader(h), h);

      const mappedHeaders = [...spec.expectedHeaders];

      // Build a mapped row set with exactly the expected headers
      const fixedRows: CsvRow[] = inRows.map((r) => {
        const out: CsvRow = {};
        for (const expected of spec.expectedHeaders) {
          const actual = actualByNorm.get(normHeader(expected));
          out[expected] = actual ? (r?.[actual] ?? "") : "";
        }
        return out;
      });

      const issues: CsvIssue[] = [];

      // Required header checks (file-level issues, not tied to a specific row)
      for (const required of spec.requiredHeaders) {
        const actual = actualByNorm.get(normHeader(required));
        if (!actual) {
          issues.push({
            rowIndex: -1,
            column: required,
            severity: "error",
            message: `Missing required column: ${required}`,
          });
        }
      }

      // Optional validations
      const emailCols = spec.emailHeaders ?? [];
      const numericCols = spec.numericHeaders ?? [];

      // Email validation (very light)
      if (emailCols.length) {
        const emailSet = new Set(emailCols.map(normHeader));
        for (let i = 0; i < fixedRows.length; i++) {
          const row = fixedRows[i];
          for (const h of spec.expectedHeaders) {
            if (!emailSet.has(normHeader(h))) continue;
            const v = (row[h] ?? "").trim();
            if (!v) continue;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
              issues.push({
                rowIndex: i,
                column: h,
                severity: "warning",
                message: "Email looks invalid",
              });
            }
          }
        }
      }

      // Numeric validation (very light)
      if (numericCols.length) {
        const numSet = new Set(numericCols.map(normHeader));
        for (let i = 0; i < fixedRows.length; i++) {
          const row = fixedRows[i];
          for (const h of spec.expectedHeaders) {
            if (!numSet.has(normHeader(h))) continue;
            const v = (row[h] ?? "").trim();
            if (!v) continue;
            const cleaned = v.replace(/[,\\s\\$£€¥]/g, "");
            if (!/^[-+]?\\d*(\\.\\d+)?$/.test(cleaned)) {
              issues.push({
                rowIndex: i,
                column: h,
                severity: "warning",
                message: "Value should be numeric",
              });
            }
          }
        }
      }

      return {
        fixedHeaders: mappedHeaders,
        fixedRows,
        issues,
        fixesApplied: [],
      };
    },
  };
}

// Ecommerce / marketplaces
export const formatPackEcommerce: CsvFormat[] = [
  buildSimpleFormat({
    id: "woocommerce_products",
    name: "WooCommerce Products",
    description: "Maps products into a WooCommerce-friendly template and flags common issues.",
    category: "Ecommerce",
    expectedHeaders: [
      "ID",
      "Type",
      "SKU",
      "Name",
      "Published",
      "Regular price",
      "Sale price",
      "Stock",
      "Categories",
      "Tags",
      "Images",
    ],
    requiredHeaders: ["SKU", "Name"],
    numericHeaders: ["Regular price", "Sale price", "Stock"],
  }),
  buildSimpleFormat({
    id: "bigcommerce_products",
    name: "BigCommerce Products",
    description: "Maps product columns for BigCommerce imports and flags missing required fields.",
    category: "Ecommerce",
    expectedHeaders: [
      "Product Name",
      "Product SKU",
      "Price",
      "Weight",
      "Category",
      "Description",
      "Product Image URL",
    ],
    requiredHeaders: ["Product Name", "Product SKU"],
    numericHeaders: ["Price", "Weight"],
  }),
  buildSimpleFormat({
    id: "etsy_listings",
    name: "Etsy Listings",
    description: "Prepares a listings template and highlights missing or suspicious values.",
    category: "Ecommerce",
    expectedHeaders: [
      "Title",
      "Description",
      "Price",
      "Quantity",
      "SKU",
      "Tags",
      "Who made it",
      "When was it made",
      "What is it",
    ],
    requiredHeaders: ["Title", "Price", "Quantity"],
    numericHeaders: ["Price", "Quantity"],
  }),
  buildSimpleFormat({
    id: "ebay_listings",
    name: "eBay Listings",
    description: "Maps to a simplified eBay listing template and flags common problems.",
    category: "Ecommerce",
    expectedHeaders: ["Title", "SKU", "Quantity", "Price", "ConditionID", "CategoryID", "PictureURL"],
    requiredHeaders: ["Title", "Quantity", "Price"],
    numericHeaders: ["Quantity", "Price"],
  }),
  buildSimpleFormat({
    id: "amazon_inventory_loader",
    name: "Amazon Inventory Loader",
    description: "Builds a simplified Amazon inventory template and flags missing essentials.",
    category: "Ecommerce",
    expectedHeaders: ["sku", "product-id", "product-id-type", "price", "quantity", "item-name", "brand-name"],
    requiredHeaders: ["sku", "item-name"],
    numericHeaders: ["price", "quantity"],
  }),
];

// Marketing / ads
export const formatPackMarketing: CsvFormat[] = [
  buildSimpleFormat({
    id: "mailchimp_contacts",
    name: "Mailchimp Contacts",
    description: "Maps contact fields for Mailchimp imports and flags invalid emails.",
    category: "Marketing",
    expectedHeaders: ["Email Address", "First Name", "Last Name", "Phone Number"],
    requiredHeaders: ["Email Address"],
    emailHeaders: ["Email Address"],
  }),
  buildSimpleFormat({
    id: "klaviyo_profiles",
    name: "Klaviyo Profiles",
    description: "Prepares a Klaviyo profile import template and flags invalid emails.",
    category: "Marketing",
    expectedHeaders: ["email", "first_name", "last_name", "phone_number"],
    requiredHeaders: ["email"],
    emailHeaders: ["email"],
  }),
  buildSimpleFormat({
    id: "meta_custom_audience",
    name: "Meta Custom Audience",
    description: "Builds a simple Meta Customer List template for email and phone matching.",
    category: "Marketing",
    expectedHeaders: ["email", "phone", "first_name", "last_name", "country", "zip"],
    requiredHeaders: ["email"],
    emailHeaders: ["email"],
  }),
  buildSimpleFormat({
    id: "google_ads_customer_match",
    name: "Google Ads Customer Match",
    description: "Creates a basic Google Ads customer match template and flags invalid emails.",
    category: "Marketing",
    expectedHeaders: ["Email", "Phone", "First Name", "Last Name", "Country", "Zip"],
    requiredHeaders: ["Email"],
    emailHeaders: ["Email"],
  }),
];

// CRM
export const formatPackCrm: CsvFormat[] = [
  buildSimpleFormat({
    id: "hubspot_contacts",
    name: "HubSpot Contacts",
    description: "Maps fields for HubSpot contact imports and flags invalid emails.",
    category: "CRM",
    expectedHeaders: ["Email", "First Name", "Last Name", "Phone", "Company"],
    requiredHeaders: ["Email"],
    emailHeaders: ["Email"],
  }),
  buildSimpleFormat({
    id: "salesforce_leads",
    name: "Salesforce Leads",
    description: "Creates a simple Salesforce lead import template and flags invalid emails.",
    category: "CRM",
    expectedHeaders: ["Company", "Last Name", "First Name", "Email", "Phone", "Lead Source"],
    requiredHeaders: ["Company", "Last Name"],
    emailHeaders: ["Email"],
  }),
  buildSimpleFormat({
    id: "zoho_contacts",
    name: "Zoho Contacts",
    description: "Maps contacts for Zoho imports and flags invalid emails.",
    category: "CRM",
    expectedHeaders: ["First Name", "Last Name", "Email", "Phone", "Account Name"],
    requiredHeaders: ["Last Name"],
    emailHeaders: ["Email"],
  }),
];

// Accounting / finance
export const formatPackAccounting: CsvFormat[] = [
  buildSimpleFormat({
    id: "quickbooks_transactions",
    name: "QuickBooks Transactions",
    description: "Builds a basic transaction import template and flags non-numeric amounts.",
    category: "Accounting",
    expectedHeaders: ["Date", "Description", "Amount", "Category"],
    requiredHeaders: ["Date", "Amount"],
    numericHeaders: ["Amount"],
  }),
  buildSimpleFormat({
    id: "xero_bank_statement",
    name: "Xero Bank Statement",
    description: "Creates a simple bank statement import template and flags invalid amounts.",
    category: "Accounting",
    expectedHeaders: ["Date", "Payee", "Description", "Amount"],
    requiredHeaders: ["Date", "Amount"],
    numericHeaders: ["Amount"],
  }),
];

// Shipping
export const formatPackShipping: CsvFormat[] = [
  buildSimpleFormat({
    id: "shipstation_orders",
    name: "ShipStation Orders",
    description: "Maps order fields for ShipStation and flags missing required address fields.",
    category: "Shipping",
    expectedHeaders: [
      "Order Number",
      "Order Date",
      "Recipient Name",
      "Address 1",
      "City",
      "State",
      "Postal Code",
      "Country",
      "SKU",
      "Quantity",
    ],
    requiredHeaders: ["Order Number", "Recipient Name", "Address 1", "City", "Postal Code"],
    numericHeaders: ["Quantity"],
  }),
  buildSimpleFormat({
    id: "pirate_ship_addresses",
    name: "Pirate Ship Addresses",
    description: "Builds an address import template for Pirate Ship and flags missing essentials.",
    category: "Shipping",
    expectedHeaders: ["Name", "Company", "Address 1", "Address 2", "City", "State", "Zip", "Country", "Phone", "Email"],
    requiredHeaders: ["Name", "Address 1", "City", "Zip", "Country"],
    emailHeaders: ["Email"],
  }),
  buildSimpleFormat({
    id: "ups_addresses",
    name: "UPS Address Import",
    description: "Creates a basic UPS address import template and flags missing required fields.",
    category: "Shipping",
    expectedHeaders: ["Name", "Address Line 1", "City", "State/Province", "Postal Code", "Country"],
    requiredHeaders: ["Name", "Address Line 1", "City", "Postal Code", "Country"],
  }),
];

// Support / reviews
export const formatPackSupport: CsvFormat[] = [
  buildSimpleFormat({
    id: "zendesk_users",
    name: "Zendesk Users",
    description: "Builds a Zendesk user import template and flags invalid emails.",
    category: "Support",
    expectedHeaders: ["name", "email", "phone", "organization"],
    requiredHeaders: ["name", "email"],
    emailHeaders: ["email"],
  }),
  buildSimpleFormat({
    id: "gorgias_contacts",
    name: "Gorgias Contacts",
    description: "Creates a contact template for Gorgias imports and flags invalid emails.",
    category: "Support",
    expectedHeaders: ["email", "first_name", "last_name", "phone"],
    requiredHeaders: ["email"],
    emailHeaders: ["email"],
  }),
];
