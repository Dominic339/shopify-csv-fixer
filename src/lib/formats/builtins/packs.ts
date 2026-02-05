import type { CsvFormat, CsvFixResult, CsvIssue, CsvRow } from "../types";
import { normalizeRowsSafe } from "../engine";

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
      // First do safe normalization (trim, ensure strings)
      const base = normalizeRowsSafe(headers, rows);

      const inHeaders = base.fixedHeaders ?? headers;
      const inRows = base.fixedRows ?? rows;

      // Map expected headers to actual headers (case-insensitive match)
      const actualByNorm = new Map<string, string>();
      for (const h of inHeaders) actualByNorm.set(normHeader(h), h);

      const expected = spec.expectedHeaders;
      const requiredSet = new Set(spec.requiredHeaders.map(normHeader));

      // Preserve any extra columns after the expected ones
      const expectedNormSet = new Set(expected.map(normHeader));
      const extras = inHeaders.filter((h) => !expectedNormSet.has(normHeader(h)));

      const outHeaders = [...expected, ...extras];

      const issues: CsvIssue[] = [];
      const fixesApplied: string[] = [...(base.fixesApplied ?? [])];

      const missingExpected: string[] = [];
      for (const eh of expected) {
        if (!actualByNorm.has(normHeader(eh))) missingExpected.push(eh);
      }
      if (missingExpected.length) {
        fixesApplied.push(`Added missing columns: ${missingExpected.join(", ")}`);
      }
      fixesApplied.push("Reordered columns to match selected format");

      const emailHeaders = new Set((spec.emailHeaders ?? []).map(normHeader));
      const numericHeaders = new Set((spec.numericHeaders ?? []).map(normHeader));

      const outRows: CsvRow[] = inRows.map((r, rowIndex) => {
        const out: CsvRow = {};

        // Build expected columns
        for (const eh of expected) {
          const src = actualByNorm.get(normHeader(eh));
          const v = src ? r?.[src] : "";
          const value = typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
          out[eh] = value;

          // Required checks (row-level issues so they show in manual fixes)
          if (requiredSet.has(normHeader(eh)) && value === "") {
            issues.push({
              rowIndex,
              column: eh,
              message: "Required field is missing",
              severity: "error",
            });
          }

          // Light email validation
          if (emailHeaders.has(normHeader(eh)) && value) {
            if (!value.includes("@") || !value.includes(".")) {
              issues.push({
                rowIndex,
                column: eh,
                message: "Email looks invalid",
                severity: "warning",
              });
            }
          }

          // Light numeric validation (only digits and optional punctuation)
          if (numericHeaders.has(normHeader(eh)) && value) {
            const cleaned = value.replace(/[0-9.\-]/g, "");
            if (cleaned.length > 0) {
              issues.push({
                rowIndex,
                column: eh,
                message: "Value should be numeric",
                severity: "warning",
              });
            }
          }
        }

        // Append extras unchanged (trimmed already by normalizeRowsSafe)
        for (const ex of extras) {
          const v = r?.[ex];
          out[ex] = typeof v === "string" ? v : v == null ? "" : String(v);
        }

        return out;
      });

      return {
        fixedHeaders: outHeaders,
        fixedRows: outRows,
        issues,
        fixesApplied,
      };
    },
  };
}

const SPECS: FormatSpec[] = [
  // Ecommerce / marketplaces
  {
    id: "woocommerce_products",
    name: "WooCommerce Products",
    description: "Basic WooCommerce product import layout with safe cleanup.",
    category: "Ecommerce",
    expectedHeaders: ["ID", "Type", "SKU", "Name", "Published", "Regular price", "Sale price", "Description", "Images"],
    requiredHeaders: ["Name"],
  },
  {
    id: "bigcommerce_products",
    name: "BigCommerce Products",
    description: "Basic BigCommerce product import layout with safe cleanup.",
    category: "Ecommerce",
    expectedHeaders: ["Product Name", "Product Type", "SKU", "Description", "Price", "Weight", "Visible", "Categories"],
    requiredHeaders: ["Product Name"],
  },
  {
    id: "etsy_listings",
    name: "Etsy Listings",
    description: "Simplified Etsy listings layout with safe cleanup.",
    category: "Ecommerce",
    expectedHeaders: ["Title", "Description", "Price", "Quantity", "SKU", "Tags", "Who made it", "When made", "Materials"],
    requiredHeaders: ["Title", "Price", "Quantity"],
    numericHeaders: ["Price", "Quantity"],
  },
  {
    id: "ebay_listings",
    name: "eBay Listings",
    description: "Simplified eBay listings layout with safe cleanup.",
    category: "Ecommerce",
    expectedHeaders: ["Title", "Description", "StartPrice", "Quantity", "SKU", "ConditionID", "Category", "PictureURL"],
    requiredHeaders: ["Title", "StartPrice", "Quantity"],
    numericHeaders: ["StartPrice", "Quantity"],
  },
  {
    id: "amazon_inventory_loader",
    name: "Amazon Inventory Loader (Simplified)",
    description: "Simplified Amazon inventory loader style columns.",
    category: "Ecommerce",
    expectedHeaders: ["sku", "product-id", "product-id-type", "price", "quantity", "condition-type", "item-name", "item-description"],
    requiredHeaders: ["sku", "price", "quantity"],
    numericHeaders: ["price", "quantity", "product-id-type"],
  },

  // Marketing / ads
  {
    id: "mailchimp_contacts",
    name: "Mailchimp Contacts",
    description: "Mailchimp contacts import basics (email + name).",
    category: "Marketing",
    expectedHeaders: ["Email Address", "First Name", "Last Name", "Phone Number"],
    requiredHeaders: ["Email Address"],
    emailHeaders: ["Email Address"],
  },
  {
    id: "klaviyo_profiles",
    name: "Klaviyo Profiles",
    description: "Klaviyo profiles import basics (email + name).",
    category: "Marketing",
    expectedHeaders: ["email", "first_name", "last_name", "phone_number"],
    requiredHeaders: ["email"],
    emailHeaders: ["email"],
  },
  {
    id: "meta_custom_audience",
    name: "Meta Custom Audience (Email/Phone)",
    description: "Meta custom audience basic identifiers.",
    category: "Marketing",
    expectedHeaders: ["email", "phone", "fn", "ln", "ct", "st", "zip", "country"],
    requiredHeaders: ["email"],
    emailHeaders: ["email"],
  },
  {
    id: "google_ads_customer_match",
    name: "Google Ads Customer Match",
    description: "Google Ads customer match basic identifiers.",
    category: "Marketing",
    expectedHeaders: ["Email", "Phone", "First Name", "Last Name", "Country", "Zip"],
    requiredHeaders: ["Email"],
    emailHeaders: ["Email"],
  },

  // CRM
  {
    id: "hubspot_contacts",
    name: "HubSpot Contacts",
    description: "HubSpot contacts import basics.",
    category: "CRM",
    expectedHeaders: ["Email", "First Name", "Last Name", "Phone Number", "Company Name"],
    requiredHeaders: ["Email"],
    emailHeaders: ["Email"],
  },
  {
    id: "salesforce_leads",
    name: "Salesforce Leads",
    description: "Salesforce leads import basics.",
    category: "CRM",
    expectedHeaders: ["First Name", "Last Name", "Company", "Email", "Phone", "Status"],
    requiredHeaders: ["Last Name", "Company"],
    emailHeaders: ["Email"],
  },
  {
    id: "zoho_contacts",
    name: "Zoho Contacts",
    description: "Zoho contacts import basics.",
    category: "CRM",
    expectedHeaders: ["First Name", "Last Name", "Email", "Phone", "Account Name"],
    requiredHeaders: ["Last Name"],
    emailHeaders: ["Email"],
  },

  // Accounting / finance
  {
    id: "quickbooks_transactions_basic",
    name: "QuickBooks Transactions Import (Basic)",
    description: "Basic transaction import layout with safe cleanup.",
    category: "Accounting",
    expectedHeaders: ["Date", "Description", "Amount", "Type", "Account"],
    requiredHeaders: ["Date", "Amount"],
    numericHeaders: ["Amount"],
  },
  {
    id: "xero_bank_statement_basic",
    name: "Xero Bank Statement Import",
    description: "Basic bank statement import layout with safe cleanup.",
    category: "Accounting",
    expectedHeaders: ["Date", "Amount", "Payee", "Description", "Reference"],
    requiredHeaders: ["Date", "Amount"],
    numericHeaders: ["Amount"],
  },

  // Shipping
  {
    id: "shipstation_orders",
    name: "ShipStation Orders Import",
    description: "Basic order import layout for ShipStation.",
    category: "Shipping",
    expectedHeaders: ["Order Number", "Order Date", "Ship Name", "Ship Address 1", "Ship City", "Ship State", "Ship Postal Code", "Ship Country", "SKU", "Quantity"],
    requiredHeaders: ["Order Number", "Ship Name", "Ship Address 1", "Ship City", "Ship Postal Code", "Ship Country"],
    numericHeaders: ["Quantity"],
  },
  {
    id: "pirate_ship_addresses",
    name: "Pirate Ship Address Import",
    description: "Basic address import layout for Pirate Ship.",
    category: "Shipping",
    expectedHeaders: ["Name", "Company", "Address1", "Address2", "City", "State", "Zip", "Country", "Phone", "Email"],
    requiredHeaders: ["Name", "Address1", "City", "Zip", "Country"],
    emailHeaders: ["Email"],
  },
  {
    id: "ups_addresses_basic",
    name: "UPS Address Import (Basic)",
    description: "Basic UPS address import layout with safe cleanup.",
    category: "Shipping",
    expectedHeaders: ["Company or Name", "Address Line 1", "Address Line 2", "City", "State/Province", "Postal Code", "Country", "Phone", "Email"],
    requiredHeaders: ["Company or Name", "Address Line 1", "City", "Postal Code", "Country"],
    emailHeaders: ["Email"],
  },

  // Support / reviews
  {
    id: "zendesk_users",
    name: "Zendesk Users Import",
    description: "Zendesk users import basics.",
    category: "Support",
    expectedHeaders: ["name", "email", "role", "phone", "organization"],
    requiredHeaders: ["name", "email"],
    emailHeaders: ["email"],
  },
  {
    id: "gorgias_contacts",
    name: "Gorgias Contacts Import",
    description: "Gorgias contacts import basics.",
    category: "Support",
    expectedHeaders: ["email", "first_name", "last_name", "phone", "external_id"],
    requiredHeaders: ["email"],
    emailHeaders: ["email"],
  },
];

export const builtinPackFormats: CsvFormat[] = SPECS.map(buildSimpleFormat);
