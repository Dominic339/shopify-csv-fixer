// src/lib/formats/builtins/packs.ts
import type { CsvFixResult, CsvFormat, CsvFormatCategory, CsvRow, CsvIssue } from "../types";
import { woocommerceProducts } from "./woocommerceProducts";
import { etsyListings } from "./etsyListings";

type FormatSpec = {
  id: string;
  name: string;
  description: string;
  category: CsvFormatCategory;

  expectedHeaders: string[];
  requiredHeaders: string[];

  emailHeaders?: string[];
  numericHeaders?: string[];
};

function normHeader(s: string) {
  return s.trim().toLowerCase();
}

function isBlank(v: unknown) {
  return v == null || String(v).trim() === "";
}

function sampleValueFor(header: string) {
  const h = header.toLowerCase();
  if (h === "id") return "";
  if (h.includes("email")) return "name@domain.com";
  if (h.includes("first")) return "Sam";
  if (h.includes("last")) return "Example";
  if (h.includes("phone")) return "+15551234567";
  if (h.includes("sku")) return "SKU-1001";
  if (h.includes("name") || h.includes("title") || h.includes("item")) return "Sample Item";
  if (h.includes("description")) return "Sample description.";
  if (h.includes("price")) return "19.99";
  if (h.includes("quantity") || h.includes("stock")) return "10";
  if (h.includes("category")) return "Example Category";
  if (h.includes("tag")) return "tag-one, tag-two";
  if (h.includes("image") || h.includes("url")) return "https://example.com/image.jpg";
  if (h.includes("published")) return "1";
  if (h.includes("type")) return "simple";
  return "";
}

export function buildSimpleFormat(spec: FormatSpec): CsvFormat {
  return {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    category: spec.category,
    source: "builtin",

    expectedHeaders: spec.expectedHeaders,
    exampleRow: Object.fromEntries(spec.expectedHeaders.map((h) => [h, sampleValueFor(h)])),
    seo: {
      longDescription: [
        spec.description,
        "This preset provides a clean template layout, validates required fields, and helps you export a consistent CSV that is easier to import into the target platform.",
      ],
      howItWorks: [
        "Upload your CSV.",
        "We map columns into the expected header set and validate required fields.",
        "We flag missing or suspicious values and export a cleaner file.",
      ],
      commonFixes: [
        "Map input headers into a consistent template.",
        "Flag missing required fields.",
        "Validate basic number fields (price, quantity, stock) where applicable.",
      ],
    },

    apply: (headers: string[], rows: CsvRow[]): CsvFixResult => {
      const inHeaders = headers ?? [];
      const inRows = rows ?? [];

      const issues: CsvIssue[] = [];
      const fixesApplied: string[] = [];

      const actualByNorm = new Map<string, string>();
      for (const h of inHeaders) actualByNorm.set(normHeader(h), h);

      const fixedHeaders = [...spec.expectedHeaders];

      const fixedRows: CsvRow[] = inRows.map((r) => {
        const out: CsvRow = {};
        for (const expected of spec.expectedHeaders) {
          const actual = actualByNorm.get(normHeader(expected));
          out[expected] = actual ? (r?.[actual] ?? "") : "";
        }
        return out;
      });

      // File-level: missing required columns
      for (const required of spec.requiredHeaders) {
        const actual = actualByNorm.get(normHeader(required));
        if (!actual) {
          issues.push({
            rowIndex: -1,
            column: required,
            severity: "error",
            message: `Missing required column "${required}".`,
            code: `${spec.id}/missing_required_column`,
            suggestion: `Add the "${required}" column header.`,
          });
        }
      }

      // Row-level required blanks (cap)
      const MAX_ROW_ISSUES = 800;
      let rowIssueCount = 0;

      for (let i = 0; i < fixedRows.length && rowIssueCount < MAX_ROW_ISSUES; i++) {
        const row = fixedRows[i];
        for (const required of spec.requiredHeaders) {
          const v = row?.[required];
          if (isBlank(v)) {
            issues.push({
              rowIndex: i,
              column: required,
              severity: "error",
              message: `Required field "${required}" is blank.`,
              code: `${spec.id}/required_blank`,
              suggestion: `Fill in "${required}".`,
            });
            rowIssueCount++;
            if (rowIssueCount >= MAX_ROW_ISSUES) break;
          }
        }
      }

      // Email validators
      if (spec.emailHeaders?.length) {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
        for (let i = 0; i < fixedRows.length; i++) {
          for (const col of spec.emailHeaders) {
            const v = String(fixedRows[i]?.[col] ?? "").trim();
            if (!v) continue;
            if (!emailRe.test(v)) {
              issues.push({
                rowIndex: i,
                column: col,
                severity: "warning",
                message: `Invalid email format: "${v}".`,
                code: `${spec.id}/invalid_email`,
                suggestion: `Fix the email formatting (example: name@domain.com).`,
              });
            }
          }
        }
      }

      // Numeric validators
      if (spec.numericHeaders?.length) {
        for (let i = 0; i < fixedRows.length; i++) {
          for (const col of spec.numericHeaders) {
            const raw = String(fixedRows[i]?.[col] ?? "").trim();
            if (!raw) continue;
            const cleaned = raw.replace(/[$,]/g, "").trim();
            const n = Number(cleaned);
            if (!Number.isFinite(n)) {
              issues.push({
                rowIndex: i,
                column: col,
                severity: "warning",
                message: `Not a valid number: "${raw}".`,
                code: `${spec.id}/invalid_number`,
                suggestion: `Use a plain numeric value (no currency symbols).`,
              });
            }
          }
        }
      }

      return { fixedHeaders, fixedRows, issues, fixesApplied };
    },
  };
}

// Ecommerce
export const formatPackEcommerce: CsvFormat[] = [
  woocommerceProducts,
  etsyListings,
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
    requiredHeaders: ["sku", "item-name", "price", "quantity"],
    numericHeaders: ["price", "quantity"],
  }),
];

// Marketing
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

// Accounting
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
    expectedHeaders: ["Order Number", "Order Date", "Recipient Name", "Address 1", "City", "State", "Postal Code", "Country", "SKU", "Quantity"],
    requiredHeaders: ["Order Number", "Recipient Name", "Address 1", "City", "Postal Code", "Country"],
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

// Support
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
