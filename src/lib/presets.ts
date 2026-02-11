// src/lib/presets.ts

export type PresetCategory =
  | "Ecommerce"
  | "CRM"
  | "Marketing"
  | "Accounting"
  | "Shipping"
  | "Support";

export type PresetFormat = {
  // Used for /presets/[id]
  id: string;

  // Display
  name: string;
  description: string;
  category: PresetCategory;

  // Must match the CsvFormat id used in your app formats list
  formatId: string;

  // Used for “example table” and “download sample csv”
  columns: string[];
  sampleRows: Record<string, string>[];
};

function row(columns: string[], values: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const c of columns) out[c] = values[c] ?? "";
  return out;
}

// NOTE: Keep these ids aligned with your format ids from getAllFormats()
export const PRESET_FORMATS: PresetFormat[] = [
  // Ecommerce
  (() => {
    const columns = [
      "Handle",
      "Title",
      "Body (HTML)",
      "Vendor",
      "Product Category",
      "Type",
      "Tags",
      "Published",
      "Option1 Name",
      "Option1 Value",
      "Variant SKU",
      "Variant Price",
      "Variant Inventory Qty",
      "Image Src",
    ];
    return {
      id: "shopify_products",
      name: "Shopify Products",
      description: "Fix common Shopify product import issues (handles, variants, pricing, inventory).",
      category: "Ecommerce",
      formatId: "shopify_products",
      columns,
      sampleRows: [
        row(columns, {
          Handle: "vibrant-mug",
          Title: "Vibrant Mug",
          "Body (HTML)": "<p>Colorful ceramic mug.</p>",
          Vendor: "CSNest",
          "Product Category": "Home & Garden > Kitchen & Dining > Drinkware",
          Type: "Mug",
          Tags: "mug,ceramic",
          Published: "TRUE",
          "Option1 Name": "Size",
          "Option1 Value": "12oz",
          "Variant SKU": "MUG-12",
          "Variant Price": "12.99",
          "Variant Inventory Qty": "100",
          "Image Src": "https://example.com/mug.jpg",
        }),
      ],
    };
  })(),

  (() => {
    const columns = ["Name", "Type", "SKU", "Regular price", "Sale price", "Description", "Categories", "Images"];
    return {
      id: "woocommerce_products",
      name: "WooCommerce Products",
      description: "Normalize WooCommerce product imports and flag missing required fields.",
      category: "Ecommerce",
      formatId: "woocommerce_products",
      columns,
      sampleRows: [
        row(columns, {
          Name: "Vibrant Mug",
          Type: "simple",
          SKU: "MUG-12",
          "Regular price": "12.99",
          "Sale price": "",
          Description: "Colorful ceramic mug.",
          Categories: "Mugs",
          Images: "https://example.com/mug.jpg",
        }),
      ],
    };
  })(),

  (() => {
    const columns = ["Product Name", "Product SKU", "Price", "Inventory Level", "Category", "Description", "Image URL"];
    return {
      id: "bigcommerce_products",
      name: "BigCommerce Products",
      description: "Maps product columns for BigCommerce imports and flags missing required fields.",
      category: "Ecommerce",
      formatId: "bigcommerce_products",
      columns,
      sampleRows: [
        row(columns, {
          "Product Name": "Vibrant Mug",
          "Product SKU": "MUG-12",
          Price: "12.99",
          "Inventory Level": "100",
          Category: "Mugs",
          Description: "Colorful ceramic mug.",
          "Image URL": "https://example.com/mug.jpg",
        }),
      ],
    };
  })(),

  (() => {
    const columns = ["TITLE", "DESCRIPTION", "PRICE", "QUANTITY", "TAGS", "IMAGE1"];
    return {
      id: "etsy_listings",
      name: "Etsy Listings",
      description: "Normalize Etsy listing exports and flag common formatting issues.",
      category: "Ecommerce",
      formatId: "etsy_listings",
      columns,
      sampleRows: [
        row(columns, {
          TITLE: "Vibrant Mug",
          DESCRIPTION: "Colorful ceramic mug.",
          PRICE: "12.99",
          QUANTITY: "100",
          TAGS: "mug,ceramic",
          IMAGE1: "https://example.com/mug.jpg",
        }),
      ],
    };
  })(),

  (() => {
    const columns = ["Title", "Price", "Quantity", "Condition", "Description", "ImageURL"];
    return {
      id: "ebay_listings",
      name: "eBay Listings",
      description: "Clean a simplified eBay listing template and flag common problems before import.",
      category: "Ecommerce",
      formatId: "ebay_listings",
      columns,
      sampleRows: [
        row(columns, {
          Title: "Vibrant Mug",
          Price: "12.99",
          Quantity: "100",
          Condition: "New",
          Description: "Colorful ceramic mug.",
          ImageURL: "https://example.com/mug.jpg",
        }),
      ],
    };
  })(),

  (() => {
    const columns = ["sku", "product-name", "price", "quantity", "condition", "image-url"];
    return {
      id: "amazon_inventory_loader",
      name: "Amazon Inventory Loader",
      description: "Build a simplified Amazon inventory template and flag missing essentials.",
      category: "Ecommerce",
      formatId: "amazon_inventory_loader",
      columns,
      sampleRows: [
        row(columns, {
          sku: "MUG-12",
          "product-name": "Vibrant Mug",
          price: "12.99",
          quantity: "100",
          condition: "new",
          "image-url": "https://example.com/mug.jpg",
        }),
      ],
    };
  })(),

  // Marketing
  (() => {
    const columns = ["Email Address", "First Name", "Last Name", "Phone Number", "Tags"];
    return {
      id: "mailchimp_contacts",
      name: "Mailchimp Contacts",
      description: "Clean contact imports and flag invalid emails and required fields.",
      category: "Marketing",
      formatId: "mailchimp_contacts",
      columns,
      sampleRows: [
        row(columns, {
          "Email Address": "alex@example.com",
          "First Name": "Alex",
          "Last Name": "Smith",
          "Phone Number": "+15551234567",
          Tags: "newsletter",
        }),
      ],
    };
  })(),

  (() => {
    const columns = ["email", "first_name", "last_name", "phone_number", "accepts_marketing"];
    return {
      id: "klaviyo_profiles",
      name: "Klaviyo Profiles",
      description: "Normalize profile exports and reduce import errors caused by formatting and blanks.",
      category: "Marketing",
      formatId: "klaviyo_profiles",
      columns,
      sampleRows: [
        row(columns, {
          email: "alex@example.com",
          first_name: "Alex",
          last_name: "Smith",
          phone_number: "+15551234567",
          accepts_marketing: "true",
        }),
      ],
    };
  })(),

  (() => {
    const columns = ["email", "phone", "first_name", "last_name", "country", "zip"];
    return {
      id: "meta_custom_audience",
      name: "Meta Custom Audience",
      description: "Prepare customer-match style audiences and flag invalid identifiers.",
      category: "Marketing",
      formatId: "meta_custom_audience",
      columns,
      sampleRows: [
        row(columns, {
          email: "alex@example.com",
          phone: "+15551234567",
          first_name: "Alex",
          last_name: "Smith",
          country: "US",
          zip: "02139",
        }),
      ],
    };
  })(),

  (() => {
    const columns = ["Email", "Phone", "First Name", "Last Name", "Country", "Zip"];
    return {
      id: "google_ads_customer_match",
      name: "Google Ads Customer Match",
      description: "Normalize customer match uploads and flag invalid or missing identifiers.",
      category: "Marketing",
      formatId: "google_ads_customer_match",
      columns,
      sampleRows: [
        row(columns, {
          Email: "alex@example.com",
          Phone: "+15551234567",
          "First Name": "Alex",
          "Last Name": "Smith",
          Country: "US",
          Zip: "02139",
        }),
      ],
    };
  })(),

  // CRM
  (() => {
    const columns = ["Email", "First Name", "Last Name", "Phone Number", "Company", "Lifecycle Stage"];
    return {
      id: "hubspot_contacts",
      name: "HubSpot Contacts",
      description: "Maps fields for HubSpot contact imports and flags invalid emails.",
      category: "CRM",
      formatId: "hubspot_contacts",
      columns,
      sampleRows: [
        row(columns, {
          Email: "alex@example.com",
          "First Name": "Alex",
          "Last Name": "Smith",
          "Phone Number": "+15551234567",
          Company: "CSNest",
          "Lifecycle Stage": "lead",
        }),
      ],
    };
  })(),

  (() => {
    const columns = ["Email", "First Name", "Last Name", "Company", "Title", "Status"];
    return {
      id: "salesforce_leads",
      name: "Salesforce Leads",
      description: "Create a simple Salesforce lead import template and flag invalid emails.",
      category: "CRM",
      formatId: "salesforce_leads",
      columns,
      sampleRows: [
        row(columns, {
          Email: "alex@example.com",
          "First Name": "Alex",
          "Last Name": "Smith",
          Company: "CSNest",
          Title: "Owner",
          Status: "Open - Not Contacted",
        }),
      ],
    };
  })(),

  (() => {
    const columns = ["Email", "First Name", "Last Name", "Phone", "Account Name"];
    return {
      id: "zoho_contacts",
      name: "Zoho Contacts",
      description: "Maps contacts for Zoho imports and flags invalid emails.",
      category: "CRM",
      formatId: "zoho_contacts",
      columns,
      sampleRows: [
        row(columns, {
          Email: "alex@example.com",
          "First Name": "Alex",
          "Last Name": "Smith",
          Phone: "+15551234567",
          "Account Name": "CSNest",
        }),
      ],
    };
  })(),

  // Accounting
  (() => {
    const columns = ["Date", "Description", "Amount", "Category", "Account"];
    return {
      id: "quickbooks_transactions",
      name: "QuickBooks Transactions",
      description: "Build a transaction import template and flag non-numeric amounts.",
      category: "Accounting",
      formatId: "quickbooks_transactions",
      columns,
      sampleRows: [
        row(columns, {
          Date: "2026-02-11",
          Description: "Office supplies",
          Amount: "19.99",
          Category: "Supplies",
          Account: "Checking",
        }),
      ],
    };
  })(),

  (() => {
    const columns = ["Date", "Payee", "Reference", "Amount", "Currency"];
    return {
      id: "xero_bank_statement",
      name: "Xero Bank Statement",
      description: "Creates a simple bank statement import template and flags invalid amounts.",
      category: "Accounting",
      formatId: "xero_bank_statement",
      columns,
      sampleRows: [
        row(columns, {
          Date: "2026-02-11",
          Payee: "Office Depot",
          Reference: "INV-1001",
          Amount: "-19.99",
          Currency: "USD",
        }),
      ],
    };
  })(),

  // Shipping
  (() => {
    const columns = ["Order Number", "Recipient Name", "Address 1", "City", "State", "Postal Code", "Country", "Phone"];
    return {
      id: "shipstation_orders",
      name: "ShipStation Orders",
      description: "Clean ShipStation order imports and normalize common fields.",
      category: "Shipping",
      formatId: "shipstation_orders",
      columns,
      sampleRows: [
        row(columns, {
          "Order Number": "1001",
          "Recipient Name": "Alex Smith",
          "Address 1": "1 Main St",
          City: "Boston",
          State: "MA",
          "Postal Code": "02139",
          Country: "US",
          Phone: "+15551234567",
        }),
      ],
    };
  })(),

  (() => {
    const columns = ["Name", "Address1", "Address2", "City", "State", "Zip", "Country", "Email"];
    return {
      id: "pirate_ship_addresses",
      name: "Pirate Ship Addresses",
      description: "Normalize address imports and flag missing pieces that break label creation.",
      category: "Shipping",
      formatId: "pirate_ship_addresses",
      columns,
      sampleRows: [
        row(columns, {
          Name: "Alex Smith",
          Address1: "1 Main St",
          Address2: "Apt 2",
          City: "Boston",
          State: "MA",
          Zip: "02139",
          Country: "US",
          Email: "alex@example.com",
        }),
      ],
    };
  })(),

  (() => {
    const columns = ["Name", "Address 1", "Address 2", "City", "State", "Postal Code", "Country", "Phone"];
    return {
      id: "ups_address_import",
      name: "UPS Address Import",
      description: "Standardize address fields and flag missing required columns for UPS imports.",
      category: "Shipping",
      formatId: "ups_address_import",
      columns,
      sampleRows: [
        row(columns, {
          Name: "Alex Smith",
          "Address 1": "1 Main St",
          "Address 2": "Apt 2",
          City: "Boston",
          State: "MA",
          "Postal Code": "02139",
          Country: "US",
          Phone: "+15551234567",
        }),
      ],
    };
  })(),

  // Support
  (() => {
    const columns = ["Email", "Name", "Role", "Organization", "External ID"];
    return {
      id: "zendesk_users",
      name: "Zendesk Users",
      description: "Normalize support user imports and flag missing or invalid values.",
      category: "Support",
      formatId: "zendesk_users",
      columns,
      sampleRows: [
        row(columns, {
          Email: "alex@example.com",
          Name: "Alex Smith",
          Role: "end-user",
          Organization: "CSNest",
          "External ID": "user_1001",
        }),
      ],
    };
  })(),

  (() => {
    const columns = ["email", "first_name", "last_name", "phone", "tags"];
    return {
      id: "gorgias_contacts",
      name: "Gorgias Contacts",
      description: "Clean Gorgias contact exports and reduce import failures caused by formatting.",
      category: "Support",
      formatId: "gorgias_contacts",
      columns,
      sampleRows: [
        row(columns, {
          email: "alex@example.com",
          first_name: "Alex",
          last_name: "Smith",
          phone: "+15551234567",
          tags: "vip",
        }),
      ],
    };
  })(),
];

export function getPresetFormats(): PresetFormat[] {
  return PRESET_FORMATS.slice();
}

export function getPresetById(id: string): PresetFormat | undefined {
  const needle = (id ?? "").trim().toLowerCase();
  return PRESET_FORMATS.find((p) => p.id.toLowerCase() === needle);
}

// This is what your /presets page is importing.
// It MUST be exported, and it MUST return typed values (not any).
export function groupPresetsByCategory(presets: PresetFormat[]): {
  categories: PresetCategory[];
  map: Map<PresetCategory, PresetFormat[]>;
} {
  const map = new Map<PresetCategory, PresetFormat[]>();

  for (const p of presets) {
    const list = map.get(p.category) ?? [];
    list.push(p);
    map.set(p.category, list);
  }

  // Keep your category order consistent (not random Map order)
  const categoryOrder: PresetCategory[] = ["Accounting", "CRM", "Ecommerce", "Marketing", "Shipping", "Support"];
  const categories = categoryOrder.filter((c) => map.has(c));

  // Sort presets within each category by name
  for (const c of categories) {
    const list = map.get(c) ?? [];
    list.sort((a, b) => a.name.localeCompare(b.name));
    map.set(c, list);
  }

  return { categories, map };
}
