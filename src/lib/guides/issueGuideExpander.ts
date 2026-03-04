// src/lib/guides/issueGuideExpander.ts
// Deterministic content expansion for issue-based guide pages.
// No AI calls, no external dependencies -- pure derived data.

export type IssueType =
  | "boolean"
  | "required_field"
  | "required_header"
  | "money"
  | "url"
  | "enum"
  | "length_limit"
  | "duplicate"
  | "variant_structure"
  | "inventory"
  | "image"
  | "seo"
  | "misc";

export type Example = { bad: string; good: string; note?: string };

export type ExpandedIssueContent = {
  issueType: IssueType;
  whereItAppears: string;
  validValues: string[] | null;
  examples: Example[];
  excelSteps: string[];
  sheetsSteps: string[];
  striveNote: string;
  preventTips: string[];
  platformNote: string | null;
  /** 1-2 sentences explaining how StriveFormats detects this issue. */
  detectionNote: string;
  /** Collapsible deep-dive: parsing internals, regex patterns, heuristics used. */
  technicalDetail: string;
};

export type IssueInput = {
  issueCode: string;
  title: string;
  explanation: string;
  whyPlatformCares: string;
  howToFix: string;
  category: string;
  autoFixable: boolean;
  blocking: boolean;
  platform: string;
};

// ---------------------------------------------------------------------------
// Column name lookup
// ---------------------------------------------------------------------------

const COLUMN_NAME_MAP: Record<string, string> = {
  blank_handle: "Handle",
  invalid_handle: "Handle",
  duplicate_handle: "Handle",
  blank_title: "Title",
  missing_title: "Title",
  title_too_long: "Title",
  blank_price: "Variant Price",
  missing_price: "Price / StartPrice",
  invalid_price: "Price / StartPrice",
  blank_variant_price: "Variant Price",
  blank_sku: "Variant SKU / sku",
  missing_sku: "sku",
  sku_too_long: "sku",
  duplicate_sku: "sku / Variant SKU",
  blank_quantity: "Variant Inventory Qty / Quantity",
  invalid_quantity: "Quantity",
  invalid_boolean_published: "Published",
  invalid_boolean_requires_shipping: "Variant Requires Shipping",
  invalid_boolean_taxable: "Variant Taxable",
  invalid_boolean_gift_card: "Gift Card",
  invalid_status: "Status",
  invalid_action: "Action",
  missing_required_header: "the header row",
  missing_category_id: "CategoryID",
  invalid_category_id: "CategoryID",
  missing_item_name: "item-name",
  item_name_too_long: "item-name",
  missing_image_src: "Image Src",
  invalid_image_url: "Image Src",
  blank_image_alt: "Image Alt Text",
};

function extractColumnName(code: string, fallback: string): string {
  const suffix = code.includes("/") ? code.split("/").slice(1).join("/") : code;
  return COLUMN_NAME_MAP[suffix] ?? fallback;
}

// ---------------------------------------------------------------------------
// Issue type classifier
// ---------------------------------------------------------------------------

export function classifyIssue(input: IssueInput): IssueType {
  const { issueCode, title, category, explanation, howToFix } = input;
  const all = `${issueCode} ${title} ${category} ${explanation} ${howToFix}`.toLowerCase();
  const suffix = issueCode.includes("/") ? issueCode.split("/").slice(1).join("/") : issueCode;

  if (suffix === "missing_required_header" || suffix === "extra_column") return "required_header";

  if (
    suffix.includes("boolean") ||
    (all.includes("true") && all.includes("false")) ||
    all.includes("y/n") ||
    all.includes("yes/no")
  )
    return "boolean";

  if (suffix.includes("duplicate")) return "duplicate";

  if (suffix.includes("too_long") || all.includes("too long") || all.includes("character limit") || all.includes("exceeds"))
    return "length_limit";

  if ((all.includes("price") || all.includes("startprice") || all.includes("regular_price")) && category === "pricing")
    return "money";

  if (suffix.includes("image_url") || suffix.includes("image_src") || category === "media") return "image";

  if (all.includes("url") && (all.includes("http") || all.includes("absolute"))) return "url";

  if (all.includes("inventory") || all.includes("quantity") || all.includes("stock") || category === "inventory")
    return "inventory";

  if (
    all.includes("variant") ||
    all.includes("variation") ||
    all.includes("parent") ||
    (all.includes("option") && category === "variant")
  )
    return "variant_structure";

  if (
    suffix.includes("invalid_status") ||
    suffix.includes("invalid_action") ||
    suffix.includes("invalid_condition") ||
    suffix.includes("invalid_type") ||
    suffix.includes("invalid_when_made") ||
    suffix.includes("invalid_who_made") ||
    suffix.includes("invalid_is_supply") ||
    suffix.includes("category_id") ||
    suffix.includes("invalid_add_delete")
  )
    return "enum";

  if (
    (all.includes("blank") || all.includes("missing") || all.includes("empty") || all.includes("required")) &&
    !suffix.includes("header")
  )
    return "required_field";

  if (category === "seo" || category === "tags") return "seo";
  if (category === "images") return "image";

  return "misc";
}

// ---------------------------------------------------------------------------
// Valid values
// ---------------------------------------------------------------------------

const BOOLEAN_BY_PLATFORM: Record<string, string[]> = {
  shopify: ["TRUE", "FALSE", "(blank -- treated as FALSE for most boolean fields)"],
  woocommerce: ["1 (true)", "0 (false)", "(the fixer normalizes common variants like yes/no)"],
  amazon: ["y  (lowercase, means true)", "n  (lowercase, means false)"],
  ebay: ["TRUE", "FALSE"],
  etsy: ["TRUE", "FALSE"],
};

const ENUM_BY_CODE: Record<string, string[]> = {
  "shopify/invalid_status": ["Active", "Draft", "Archived"],
  "shopify/invalid_boolean_published": ["TRUE", "FALSE"],
  "shopify/invalid_boolean_requires_shipping": ["TRUE", "FALSE"],
  "shopify/invalid_boolean_taxable": ["TRUE", "FALSE"],
  "shopify/invalid_boolean_gift_card": ["TRUE", "FALSE"],
  "ebay/invalid_action": ["Add", "Revise", "Delete", "End"],
  "woocommerce/invalid_type": ["simple", "variable", "variation", "grouped", "external"],
  "woocommerce/invalid_stock_status": ["instock", "outofstock", "onbackorder"],
  "woocommerce/invalid_backorders": ["no", "notify", "yes"],
  "etsy/invalid_when_made": [
    "made_to_order",
    "2020_2024",
    "2010_2019",
    "2004_2009",
    "before_2004",
    "2000_2003",
    "1990s",
    "1980s",
    "1970s",
    "1960s",
    "1950s",
    "before_1950",
  ],
  "etsy/invalid_who_made": ["i_did", "someone_else", "collective"],
  "etsy/invalid_is_supply": ["TRUE", "FALSE"],
  "amazon/invalid_add_delete": ["a (add/update)", "d (delete)"],
};

function getValidValues(type: IssueType, input: IssueInput): string[] | null {
  switch (type) {
    case "boolean":
      return BOOLEAN_BY_PLATFORM[input.platform] ?? ["TRUE", "FALSE"];
    case "money":
      return [
        "Positive decimal number -- e.g. 9.99, 100.00, 1999.95",
        "Use a period (.) as the decimal separator, not a comma",
        "No currency symbols ($, USD, GBP, EUR)",
        "No thousand separators -- write 1000.00 not 1,000.00",
        "Maximum 2 decimal places for most platforms",
      ];
    case "inventory":
      return [
        "Whole number (integer), 0 or greater",
        "No decimal places -- write 10 not 10.5",
        "No negative values -- use 0 for out-of-stock items",
      ];
    case "url":
      return [
        "Full URL starting with https:// or http://",
        "Must be publicly accessible (no login required)",
        "No spaces in the URL",
      ];
    case "image":
      return [
        "Full URL starting with https:// or http://",
        "Must be publicly accessible (no login required)",
        "No spaces in the URL",
        "Supported formats: JPG, PNG, WebP, GIF",
        "Recommended: under 20 MB per image",
      ];
    case "length_limit": {
      const m = input.explanation.match(/(\d+)\s*characters?/i);
      return m
        ? [`Maximum ${m[1]} characters`, "Count includes spaces and punctuation"]
        : ["Check the platform's documented character limit", "Use =LEN() in Excel to count characters"];
    }
    case "enum":
      return ENUM_BY_CODE[input.issueCode] ?? null;
    case "required_header":
      return [
        "All required column headers must appear in row 1 of the file",
        "Column names are case-sensitive on most platforms",
        "Missing columns must be added even if their values are blank",
        "Use the official platform template as your starting point",
      ];
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Bad vs good examples
// ---------------------------------------------------------------------------

function getExamples(type: IssueType, input: IssueInput): Example[] {
  switch (type) {
    case "boolean":
      if (input.platform === "amazon") {
        return [
          { bad: "yes", good: "y", note: "Amazon uses lowercase y/n" },
          { bad: "TRUE", good: "y" },
          { bad: "No", good: "n" },
          { bad: "FALSE", good: "n" },
        ];
      }
      return [
        { bad: "yes", good: "TRUE", note: "Must be uppercase" },
        { bad: "1", good: "TRUE" },
        { bad: "No", good: "FALSE" },
        { bad: "0", good: "FALSE" },
        { bad: "True", good: "TRUE", note: "Mixed case not accepted" },
      ];
    case "money":
      return [
        { bad: "$29.99", good: "29.99", note: "Remove currency symbols" },
        { bad: "29,99", good: "29.99", note: "Use period as decimal separator" },
        { bad: "1,000.00", good: "1000.00", note: "Remove thousand separators" },
        { bad: "29.999", good: "29.99", note: "Max 2 decimal places" },
        { bad: "free", good: "0.00", note: "Must be numeric" },
      ];
    case "inventory":
      return [
        { bad: "10.5", good: "10", note: "Whole numbers only" },
        { bad: "-1", good: "0", note: "No negative values" },
        { bad: "ten", good: "10", note: "Must be numeric" },
        { bad: "(empty)", good: "0", note: "Cannot be blank" },
      ];
    case "image":
    case "url":
      return [
        {
          bad: "products/shirt.jpg",
          good: "https://cdn.example.com/products/shirt.jpg",
          note: "Must be a full URL",
        },
        {
          bad: "www.example.com/image.jpg",
          good: "https://www.example.com/image.jpg",
          note: "Must include https://",
        },
        { bad: "C:/Users/me/image.jpg", good: "https://cdn.example.com/image.jpg", note: "No local file paths" },
        { bad: "https://example.com/my image.jpg", good: "https://example.com/my-image.jpg", note: "No spaces in URLs" },
      ];
    case "length_limit": {
      const m = input.explanation.match(/(\d+)\s*characters?/i);
      const lim = m ? parseInt(m[1], 10) : 80;
      return [
        {
          bad: `"${"x".repeat(lim + 15)}"`,
          good: `"${"x".repeat(lim - 5)}..."`,
          note: `Over ${lim} characters vs within ${lim}`,
        },
      ];
    }
    case "enum": {
      const vals = ENUM_BY_CODE[input.issueCode];
      return vals && vals.length
        ? [{ bad: "other_value", good: vals[0], note: `Must be one of: ${vals.slice(0, 3).join(", ")}` }]
        : [{ bad: "invalid_option", good: "(see valid values above)", note: "Exact spelling required" }];
    }
    case "required_field":
      return [{ bad: "(empty cell)", good: "Actual value for this field", note: "Cannot be left blank" }];
    case "required_header":
      return [
        {
          bad: "Column absent from row 1",
          good: "Column added to header row (can have blank values)",
          note: "Header must exist even if data is blank",
        },
      ];
    case "duplicate":
      return [
        { bad: "Row 3: SKU-001  Row 7: SKU-001", good: "Row 3: SKU-001  Row 7: SKU-002", note: "Each identifier must be unique" },
        {
          bad: "PROD-A appears in rows 4 and 11",
          good: "PROD-A appears once only",
          note: "Unless rows are intentional parent/variant grouping",
        },
      ];
    case "variant_structure":
      return [
        { bad: "Option2 filled but Option1 blank", good: "Option1 filled first, then Option2" },
        { bad: "Variant row appears before its parent row", good: "Parent row appears directly above variant rows" },
      ];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Excel step-by-step instructions
// ---------------------------------------------------------------------------

function getExcelSteps(type: IssueType, input: IssueInput, column: string): string[] {
  const pName = platformDisplayName(input.platform);
  switch (type) {
    case "required_header":
      return [
        `Download the official ${pName} template from the Templates section of StriveFormats.`,
        "Open both your CSV and the downloaded template in Excel.",
        "Look at row 1 in both files -- this is the header row.",
        "Identify column names that appear in the template but are missing from your file.",
        "In your CSV, click the header of an empty column and type the missing column name exactly as it appears in the template (case-sensitive).",
        "Leave the new column's cells blank if you have no data -- the column just needs to exist.",
        "Repeat for each missing column, then save as CSV (Comma delimited).",
      ];
    case "boolean":
      return [
        `In Excel, click the column letter for the ${column} column to select the entire column.`,
        "Press Ctrl+H to open Find & Replace.",
        `In 'Find what', type: yes  --  in 'Replace with', type: ${input.platform === "amazon" ? "y" : "TRUE"}  --  check 'Match entire cell contents'  --  click Replace All.`,
        `Repeat: no -> ${input.platform === "amazon" ? "n" : "FALSE"},  1 -> ${input.platform === "amazon" ? "y" : "TRUE"},  0 -> ${input.platform === "amazon" ? "n" : "FALSE"}.`,
        `Also replace: True -> ${input.platform === "amazon" ? "y" : "TRUE"},  False -> ${input.platform === "amazon" ? "n" : "FALSE"}.`,
        `Scan the column to confirm only ${input.platform === "amazon" ? "y and n" : "TRUE and FALSE"} remain (and blanks if allowed).`,
        "Save as CSV (Comma delimited).",
      ];
    case "money":
      return [
        `In Excel, click the column letter for the ${column} column to select it.`,
        "Press Ctrl+H (Find & Replace). In 'Find what', type: $  -- leave 'Replace with' blank  -- click Replace All. Repeat for the pound sign, euro sign, and any other currency prefix.",
        "Find: ,  (comma, for thousand separators like 1,000)  -- Replace with: (nothing). This converts 1,000.00 to 1000.00.",
        "Right-click the selected column, choose 'Format Cells', select 'Number', set Decimal places to 2, click OK.",
        "Scroll through the column and verify values look like 9.99 or 1000.00 with no symbols.",
        "Save as CSV (Comma delimited).",
      ];
    case "inventory":
      return [
        `In Excel, click the column letter for the ${column} column.`,
        "Right-click and choose 'Format Cells'. Select 'Number', set Decimal places to 0, click OK.",
        "Use Data > Filter on this column. Filter where value is less than 0 and change those cells to 0.",
        "Also filter for non-numeric values (text cells) and enter the correct whole number.",
        "Save as CSV (Comma delimited).",
      ];
    case "required_field":
      return [
        `In Excel, click the header letter of the ${column} column to select it.`,
        "Press Ctrl+G (Go To) -- click 'Special' -- select 'Blanks' -- click OK. Excel selects all empty cells in that column.",
        "Type the required value and press Ctrl+Enter to fill all selected blank cells at once.",
        "If different rows need different values: use Data > Filter on the column, filter for '(Blanks)', and fill each row manually.",
        "Save as CSV (Comma delimited).",
      ];
    case "url":
    case "image":
      return [
        `In Excel, click the column letter for the ${column} column.`,
        "Press Ctrl+H. Find: http://  -- Replace with: https://  -- Replace All. This upgrades insecure URLs.",
        "Scan the column for cells that start with // or just a filename like 'shirt.jpg'. Add https:// in front of each.",
        "Find: ' ' (a space character)  -- Replace with: -  -- Replace All. This removes spaces from URLs.",
        "Click a sample URL and press F5, or paste it into a browser, to confirm the image or page loads correctly.",
        "Save as CSV (Comma delimited).",
      ];
    case "length_limit": {
      const m = input.explanation.match(/(\d+)\s*characters?/i);
      const lim = m ? m[1] : "the limit";
      return [
        `In Excel, right-click the column header next to ${column} and choose 'Insert' to add a blank helper column.`,
        `In the first data row of the helper column, type: =LEN(X2)  -- replace X2 with the actual cell reference of your ${column} column.`,
        "Copy this formula down to all rows by double-clicking the fill handle (the small square in the cell's bottom-right corner).",
        `Go to Data > Filter. On the helper column, use a number filter for 'Greater Than ${lim}'.`,
        "For each flagged row, click into the original column's cell and shorten the text until the helper column shows a number at or below the limit.",
        "When done, select the helper column, right-click, and choose Delete. Save as CSV (Comma delimited).",
      ];
    }
    case "enum": {
      const vals = ENUM_BY_CODE[input.issueCode];
      const vStr = vals ? vals.slice(0, 4).join(", ") : "the allowed values listed above";
      return [
        `In Excel, click the column letter for the ${column} column.`,
        "Press Ctrl+H. In 'Find what', type the invalid value -- in 'Replace with', type the correct accepted value -- Replace All.",
        `The accepted values are: ${vStr}.`,
        "To prevent future errors, add a dropdown: select the column, go to Data > Data Validation, choose 'List', and enter the valid options separated by commas.",
        "Save as CSV (Comma delimited).",
      ];
    }
    case "duplicate":
      return [
        `In Excel, click the column letter for the ${column} column.`,
        "Go to Home > Conditional Formatting > Highlight Cell Rules > Duplicate Values. Duplicate cells will be highlighted in red.",
        "For each highlighted pair, decide which row to keep. Either delete the duplicate row, or change its identifier to something unique.",
        "After resolving all duplicates, clear the conditional formatting: Home > Conditional Formatting > Clear Rules > Clear Rules from Selected Cells.",
        "Save as CSV (Comma delimited).",
      ];
    case "variant_structure":
      return [
        "In Excel, sort your rows by the parent identifier column (Handle for Shopify, parent SKU for WooCommerce).",
        "Verify the parent row appears before all its variant rows in the sorted result.",
        "For WooCommerce: parent rows should have Type = 'variable'. Variation rows should have Type = 'variation' and the Parent column set to the parent's SKU.",
        "For Shopify: all rows in a product group must share the same Handle. Check that Option1 Name is filled before Option2 Name.",
        "Save as CSV (Comma delimited).",
      ];
    default:
      return [
        `Review the ${column} column for incorrect values.`,
        "Fix any cells that do not match the expected format.",
        "Save as CSV (Comma delimited).",
      ];
  }
}

// ---------------------------------------------------------------------------
// Google Sheets step-by-step instructions
// ---------------------------------------------------------------------------

function getSheetsSteps(type: IssueType, input: IssueInput, column: string): string[] {
  const pName = platformDisplayName(input.platform);
  const boolTarget = input.platform === "amazon" ? "y" : "TRUE";
  const boolFalse = input.platform === "amazon" ? "n" : "FALSE";

  switch (type) {
    case "required_header":
      return [
        `Download the official ${pName} template from the Templates section of StriveFormats.`,
        "Open both files in Google Sheets (drag and drop onto drive.google.com, or File > Import in an existing sheet).",
        "Compare row 1 in both files. Note any column names present in the template but absent in your file.",
        "Add the missing column names to row 1 of your file, exactly as they appear in the template (case-sensitive).",
        "Leave the new column's cells blank if you have no data -- the header must exist.",
        "Go to File > Download > Comma Separated Values (.csv).",
      ];
    case "boolean":
      return [
        `In Google Sheets, click the column letter for the ${column} column to select the whole column.`,
        "Press Ctrl+H to open Find & Replace.",
        `Set Find: yes  --  Replace with: ${boolTarget}  --  check 'Match entire cell contents'  --  Replace All.`,
        `Repeat: no -> ${boolFalse},  1 -> ${boolTarget},  0 -> ${boolFalse},  True -> ${boolTarget},  False -> ${boolFalse}.`,
        `Verify only ${input.platform === "amazon" ? "y and n" : "TRUE and FALSE"} remain in the column.`,
        "Go to File > Download > Comma Separated Values (.csv).",
      ];
    case "money":
      return [
        `In Google Sheets, click the column letter for the ${column} column.`,
        "Press Ctrl+H. Find: $  -- Replace with: (empty)  -- Replace All. Repeat for the pound sign and euro sign.",
        "Find: ,  (the comma used in thousand separators like 1,000)  -- Replace with: (empty)  -- Replace All.",
        "Select the column again. Go to Format > Number > Number to ensure cells are treated as numbers.",
        "Verify all prices look like 9.99 or 1000.00 with no symbols.",
        "Go to File > Download > Comma Separated Values (.csv).",
      ];
    case "inventory":
      return [
        `In Google Sheets, click the column letter for the ${column} column.`,
        "Go to Format > Number > Number and set decimal places to 0 (integers only).",
        "In a blank helper column, enter =MOD(A2,1) (replace A2 with your column) and copy it down. Rows showing non-zero have decimal values -- round them manually.",
        "Delete the helper column when done.",
        "Go to File > Download > Comma Separated Values (.csv).",
      ];
    case "required_field":
      return [
        `In Google Sheets, click the header of the ${column} column.`,
        "Go to Data > Create a filter.",
        "Click the filter icon on the column header, clear all checkboxes, then check '(Blanks)'. This shows only empty rows.",
        "Fill in the required value for each blank cell shown.",
        "Remove the filter: Data > Remove filter.",
        "Go to File > Download > Comma Separated Values (.csv).",
      ];
    case "url":
    case "image":
      return [
        `In Google Sheets, select the ${column} column.`,
        "Press Ctrl+H. Find: http://  -- Replace with: https://  -- Replace All.",
        "Scan the column for cells starting with // or just a filename. Add https:// in front manually.",
        "Find: ' ' (a space)  -- Replace with: -  -- Replace All to clean up any spaces in URLs.",
        "Paste a sample URL into a new browser tab to confirm it loads correctly.",
        "Go to File > Download > Comma Separated Values (.csv).",
      ];
    case "length_limit": {
      const m = input.explanation.match(/(\d+)\s*characters?/i);
      const lim = m ? m[1] : "the limit";
      return [
        `In Google Sheets, click the column letter next to ${column} and insert a blank column (right-click > Insert 1 column left/right).`,
        `In the first data row of the helper column, enter: =LEN(X2)  -- replace X2 with the cell reference for your ${column} column.`,
        "Copy the formula down to cover all data rows.",
        `Go to Data > Create a filter on the helper column. Use the filter to show only rows where the value is greater than ${lim}.`,
        "For each flagged row, shorten the original column's text until the helper column shows a number at or below the limit.",
        "Delete the helper column. Go to File > Download > Comma Separated Values (.csv).",
      ];
    }
    case "enum": {
      const vals = ENUM_BY_CODE[input.issueCode];
      const vStr = vals ? vals.slice(0, 4).join(", ") : "the allowed values listed above";
      return [
        `In Google Sheets, select the ${column} column.`,
        "Press Ctrl+H. Find the invalid value -- Replace with the correct accepted value -- Replace All.",
        `Accepted values: ${vStr}.`,
        "To add a validation dropdown: select the column, go to Data > Data Validation, choose 'Dropdown (from a list)', and enter the valid options.",
        "Go to File > Download > Comma Separated Values (.csv).",
      ];
    }
    case "duplicate":
      return [
        `In Google Sheets, click the column letter for the ${column} column.`,
        "Go to Format > Conditional formatting. Set 'Format rules' to 'Custom formula is' and enter: =COUNTIF($A:$A,A1)>1  -- replace A with your column letter.",
        "Set a highlight color (e.g., red fill) and click Done. Duplicate values will be highlighted.",
        "For each highlighted cell, either delete the duplicate row or assign it a unique identifier.",
        "Remove the conditional formatting rule when done.",
        "Go to File > Download > Comma Separated Values (.csv).",
      ];
    case "variant_structure":
      return [
        "In Google Sheets, go to Data > Sort range and sort by the parent identifier column (Handle or Parent SKU).",
        "Verify parent rows appear directly before their variant rows.",
        "For WooCommerce: parent rows need Type = 'variable'. Variation rows need Type = 'variation' and Parent = the parent SKU.",
        "For Shopify: all variant rows in a product group must share the same Handle.",
        "Go to File > Download > Comma Separated Values (.csv).",
      ];
    default:
      return [
        `Review the ${column} column for incorrect values.`,
        "Correct any cells that do not match the expected format.",
        "Go to File > Download > Comma Separated Values (.csv).",
      ];
  }
}

// ---------------------------------------------------------------------------
// StriveFormats note
// ---------------------------------------------------------------------------

function getStriveNote(type: IssueType, input: IssueInput): string {
  if (input.autoFixable) {
    switch (type) {
      case "boolean":
        return "Auto-fix normalizes common boolean variants (yes/no, 1/0, True/False) to the platform's exact required format. Upload your CSV and click Fix Issues.";
      case "required_header":
        return "Auto-fix adds all missing required column headers in one click. The added columns will be blank -- add your data into them.";
      case "money":
        return "Auto-fix removes common currency symbols and normalizes price format. Upload and click Fix Issues.";
      default:
        return "This issue is auto-fixable. Upload your CSV and click Fix Issues to apply all safe corrections at once.";
    }
  }
  switch (type) {
    case "required_field":
      return "StriveFormats flags every row where this required field is blank, so you can find and fill them quickly.";
    case "duplicate":
      return "StriveFormats highlights all rows with duplicate identifiers so you can see exactly which rows conflict.";
    case "length_limit":
      return "StriveFormats flags every row where the value exceeds the platform limit so you know exactly which cells to shorten.";
    case "variant_structure":
      return "StriveFormats detects variant structure issues and highlights the rows that are misaligned or missing required option values.";
    default:
      return "Upload your CSV to StriveFormats to detect this issue across all rows, with clear line-by-line reporting.";
  }
}

// ---------------------------------------------------------------------------
// Prevention tips
// ---------------------------------------------------------------------------

function getPreventTips(type: IssueType, input: IssueInput): string[] {
  const isAmazon = input.platform === "amazon";
  switch (type) {
    case "boolean":
      return [
        `Always type ${isAmazon ? "y or n (lowercase)" : "TRUE or FALSE (all caps)"} -- do not use spreadsheet checkboxes; export them as text instead.`,
        "If you export data from the platform's own admin panel, do not modify boolean columns in Excel -- autocorrect can silently change the values.",
        "Set the cell format to Text in Excel before pasting boolean values to prevent automatic conversion.",
        "Use StriveFormats auto-fix as a final pass before every import.",
      ];
    case "money":
      return [
        "Always format price cells as Number (2 decimal places), not Currency, in Excel.",
        "Never copy prices from a webpage or PDF -- they often include currency symbols or use commas as decimal separators.",
        "Use a period (.) as the decimal separator regardless of your computer's regional settings.",
        "Avoid using SUM() or other formula results in price cells -- use Paste Special > Values to paste plain numbers.",
        "Run every file through StriveFormats before importing to catch formatting issues early.",
      ];
    case "required_field":
      return [
        "Start from the official platform template so you know which fields are required from the start.",
        "Before exporting, run a quick filter on each required column and check for blanks.",
        "Test with a small 5-row sample CSV before uploading your full catalog.",
        "If a required field is conditional (required only for certain product types), still include the column -- just leave non-applicable rows blank.",
      ];
    case "required_header":
      return [
        "Always start from the official platform template, never a blank spreadsheet.",
        "After building your file, compare your header row to the template side-by-side before exporting.",
        "Keep a saved copy of the correct header row as a reference for future files.",
        "Run every new file through StriveFormats to verify headers match the platform's requirements.",
      ];
    case "url":
    case "image":
      return [
        "Always use the full URL starting with https://. Never use relative paths or local file paths.",
        "Before importing, paste a sample image URL into a browser to confirm it loads correctly.",
        "Host all images on a reliable CDN or cloud storage before adding URLs to your CSV.",
        "Avoid URL query parameters unless the platform explicitly supports them.",
        "Keep image files under 20 MB and use standard formats: JPG, PNG, or WebP.",
      ];
    case "length_limit":
      return [
        "Know the platform's character limits before writing titles and descriptions.",
        "Use =LEN() in Excel or Google Sheets to count characters as you type.",
        "Focus on high-impact keywords rather than full sentences in title fields.",
        "Review titles for length before exporting -- it is much faster to fix them in the source sheet.",
      ];
    case "enum":
      return [
        "Copy-paste allowed values directly from the official template to avoid typos.",
        "Use Excel Data Validation or Google Sheets Data Validation to restrict the column to a dropdown of allowed values.",
        "Check the platform's official documentation for the current list of allowed values -- they can change.",
      ];
    case "duplicate":
      return [
        "Define a clear naming convention for SKUs and identifiers before adding products.",
        "Use a prefix system (e.g., SHIRTS-001) to keep identifiers organized and unique.",
        "Before exporting, sort by the identifier column and scan for consecutive identical values.",
        "Understand the difference between intentional duplicate parent identifiers (variant grouping) and accidental duplicates.",
        "Run StriveFormats before every import to catch duplicates early.",
      ];
    case "variant_structure":
      return [
        "Always keep parent product rows directly above all their variant rows.",
        "For Shopify: use the same Handle value for all rows in one product group.",
        "For WooCommerce: parent rows have Type = variable; child rows have Type = variation with Parent = parent SKU.",
        "Test with a single product (one parent, two to three variants) before importing your full catalog.",
      ];
    case "inventory":
      return [
        "Export quantity data from your inventory system as whole numbers.",
        "Use 0 for out-of-stock items -- do not leave the quantity blank.",
        "Never copy-paste quantity data from a financial system that uses decimal places.",
      ];
    default:
      return [
        "Start from the official platform template to avoid structural issues.",
        "Run your file through StriveFormats before every import.",
        "Test with a small sample file first to catch errors before they affect your full catalog.",
      ];
  }
}

// ---------------------------------------------------------------------------
// Platform-specific notes
// ---------------------------------------------------------------------------

function platformDisplayName(platform: string): string {
  const N: Record<string, string> = {
    shopify: "Shopify",
    woocommerce: "WooCommerce",
    etsy: "Etsy",
    ebay: "eBay",
    amazon: "Amazon",
    general: "the platform",
  };
  return N[platform] ?? platform;
}

function getPlatformNote(type: IssueType, input: IssueInput): string | null {
  const { platform, issueCode } = input;

  if (type === "boolean") {
    if (platform === "shopify")
      return "Shopify requires TRUE or FALSE in all caps. A blank cell is treated as FALSE for most boolean fields. Do not use Yes, No, 1, or 0 -- Shopify's importer will reject them.";
    if (platform === "amazon")
      return "Amazon flat files use lowercase y for true and lowercase n for false. This is different from most other platforms that use TRUE/FALSE.";
    if (platform === "woocommerce")
      return "WooCommerce Product CSV supports 1 and 0 as well as yes and no for boolean fields. The StriveFormats fixer normalizes these to the correct format automatically.";
  }

  if (type === "enum" && issueCode.includes("category_id"))
    return "eBay CategoryIDs are numeric codes from eBay's category taxonomy. Find the ID by browsing eBay to the correct category and looking at the number in the URL (e.g., /b/.../{id}), or by using the eBay Category Lookup API. Using the wrong category ID causes listings to be placed in the wrong section or rejected entirely.";

  if (type === "variant_structure" && platform === "woocommerce")
    return "WooCommerce distinguishes between variable products (parent rows, Type = 'variable') and variation rows (Type = 'variation', Parent = parent SKU). The Parent column in variation rows must match the SKU of the parent row exactly, including case.";

  if (type === "variant_structure" && platform === "shopify")
    return "Shopify groups variant rows by the Handle column value. All rows sharing the same Handle belong to the same product. Option columns (Option1 Name, Option1 Value, etc.) must be consistent across every variant row in the group.";

  if (platform === "amazon" && type === "required_header")
    return "Amazon flat file column names vary by product category template (electronics, clothing, etc.). Always download the exact template for your category from Seller Central > Catalog > Add Products via Upload > Download an inventory file template.";

  if (platform === "ebay" && type === "required_field" && issueCode.includes("title"))
    return "eBay has a strict 80-character limit on listing titles. Titles that are too long or missing cause the entire row to be rejected during upload.";

  return null;
}

// ---------------------------------------------------------------------------
// How StriveFormats detects this issue
// ---------------------------------------------------------------------------

function getDetectionNote(type: IssueType, input: IssueInput): string {
  const pName = platformDisplayName(input.platform);
  const col = extractColumnName(input.issueCode, input.title);
  switch (type) {
    case "boolean":
      return `StriveFormats reads every cell in the ${col} column and checks it against ${pName}'s accepted boolean values. Any value that does not match exactly -- including mixed-case variants like "True" or "Yes" -- is flagged as an error.`;
    case "required_header":
      return `StriveFormats compares your file's header row (row 1) against the full set of required columns for the ${pName} format. Any column name from the required list that is absent triggers this issue.`;
    case "required_field":
      return `StriveFormats scans every row for blank or whitespace-only cells in the ${col} column. Rows where this field is empty are flagged because ${pName} requires a value on every row.`;
    case "money":
      return `StriveFormats validates the ${col} column by checking that each non-empty cell parses as a positive decimal number. Values containing currency symbols, commas, or non-numeric characters are flagged.`;
    case "inventory":
      return `StriveFormats validates the ${col} column by verifying that each cell is a non-negative whole number. Decimal values, negative numbers, text strings, and blank cells are all flagged.`;
    case "url":
    case "image":
      return `StriveFormats checks the ${col} column by verifying that each non-empty value begins with http:// or https:// and does not contain spaces. Values that look like relative paths or local filenames are also flagged.`;
    case "length_limit":
      return `StriveFormats measures the character length of every cell in the ${col} column and compares it against ${pName}'s documented limit. Rows exceeding the limit are individually flagged with the actual character count.`;
    case "enum":
      return `StriveFormats checks the ${col} column against the exact list of accepted values for ${pName}. The comparison is case-sensitive -- any casing variation or typo is flagged as an invalid value.`;
    case "duplicate":
      return `StriveFormats builds a frequency map of all values in the ${col} column as it parses the file. Any value that appears more than once is flagged on every row where it occurs.`;
    case "variant_structure":
      return `StriveFormats groups rows by their parent identifier (Handle for ${pName}) and checks that the structure matches the platform's variant model. Orphaned variation rows, missing parent rows, and duplicate option combinations are each flagged separately.`;
    case "seo":
      return `StriveFormats checks SEO fields for common quality issues: blank values, excessive length, values that match the product title exactly (no differentiation), and placeholder text.`;
    default:
      return `StriveFormats parses every row of your CSV and applies ${pName}-specific validation rules to the ${col} field. Any row that violates the rule is flagged with the row number and the specific value that caused the issue.`;
  }
}

function getTechnicalDetail(type: IssueType, input: IssueInput): string {
  const col = extractColumnName(input.issueCode, input.title);
  switch (type) {
    case "boolean":
      if (input.platform === "amazon")
        return `The validator applies a case-sensitive equality check: accepted values are the strings "y" and "n" only. The empty string is also accepted for optional boolean fields. The raw cell value is trimmed of leading/trailing whitespace before comparison.`;
      if (input.platform === "woocommerce")
        return `WooCommerce's importer normalizes "yes"/"no", "1"/"0", "true"/"false" internally, but the StriveFormats validator flags all non-canonical forms so that the exported file is unambiguous and portable. The accepted canonical forms are "1" (true) and "0" (false).`;
      return `The validator trims the cell value and applies a case-sensitive equality check against the set {"TRUE", "FALSE", ""}. Any value outside this set -- including "True", "true", "yes", "1" -- triggers the issue. The empty string is accepted only for fields where blank is documented as equivalent to FALSE.`;
    case "required_header":
      return `The header check runs before any row validation. The parser reads row 0 of the parsed CSV array, normalizes whitespace (trim only -- does not lowercase), and checks for set membership against the platform's required header list. Missing headers are reported as a single structured issue listing all absent column names.`;
    case "money":
      return `The price validator applies this logic in order: (1) trim whitespace, (2) strip a leading currency symbol if present and record it as a warning context, (3) attempt parseFloat(), (4) check isFinite() and value >= 0, (5) check that the string representation has at most 2 decimal places. Commas used as thousand separators are detected by the pattern /\\d,\\d{3}/ and flagged.`;
    case "inventory":
      return `The quantity validator trims whitespace, then checks: (1) the value is non-empty, (2) /^\\d+$/ matches (digits only, no decimal point), (3) the integer value is >= 0. Values like "10.0" fail step 2 even though they are numerically equivalent to 10.`;
    case "url":
    case "image":
      return `URL validation applies a two-step check: (1) the value must match /^https?:\\/\\//i, (2) the value must not contain any ASCII space character (U+0020). No network request is made -- the validator checks the URL format only, not whether the resource is accessible.`;
    case "length_limit": {
      const m = input.explanation.match(/(\d+)\s*characters?/i);
      const lim = m ? m[1] : "the documented limit";
      return `The validator calls value.length on the trimmed cell string. JavaScript's String.length counts UTF-16 code units, which matches character count for all Basic Multilingual Plane characters. Surrogate pairs (emoji, some CJK extensions) count as 2. The limit for ${col} on this platform is ${lim} characters.`;
    }
    case "enum":
      return `The validator builds a Set from the platform's allowed values and calls Set.has(trimmedValue). The check is case-sensitive and exact -- no fuzzy matching. The full allowed-values list is sourced from the platform's official importer specification and validated against a live import run.`;
    case "duplicate":
      return `The duplicate detector makes a single O(n) pass through the column values, inserting each into a Map<string, number[]> keyed by the normalized value (trimmed, lowercased for handle-type fields). After the pass, any map entry with more than one row index is flagged. For Shopify Handle, intentional multi-row grouping (variant rows) is detected by checking whether the rows share the same Handle AND have variant option signals.`;
    case "variant_structure":
      if (input.platform === "shopify")
        return `The Shopify variant checker groups all rows by Handle value. Within each group it checks: (1) at least one row has a non-blank Title (the parent row), (2) if Option1 Name is blank on a row, Option2 Name and Option3 Name must also be blank, (3) no two rows in the group have the same combination of Option1 Value + Option2 Value + Option3 Value (duplicate variant combo).`;
      if (input.platform === "woocommerce")
        return `The WooCommerce variant checker looks for variation rows (Type = "variation") that have no corresponding parent row (Type = "variable") with a matching SKU in the Parent column. It also checks that variable rows have no Variant-level price set directly on the parent (which WooCommerce ignores but signals a structural mistake).`;
      return `The variant structure validator checks the relationship between parent and child rows using the platform's grouping key and validates that required fields are present at the correct level of the hierarchy.`;
    default:
      return `The validator for the ${col} field reads each cell value, trims whitespace, and applies ${input.platform}-specific rules derived from the platform's official import specification. Each failing row is recorded with its 0-based row index and the actual cell value for precise error reporting.`;
  }
}

// ---------------------------------------------------------------------------
// Main expand function
// ---------------------------------------------------------------------------

export function expandIssueContent(input: IssueInput): ExpandedIssueContent {
  const issueType = classifyIssue(input);
  const column = extractColumnName(input.issueCode, input.title);
  return {
    issueType,
    whereItAppears: column,
    validValues: getValidValues(issueType, input),
    examples: getExamples(issueType, input),
    excelSteps: getExcelSteps(issueType, input, column),
    sheetsSteps: getSheetsSteps(issueType, input, column),
    striveNote: getStriveNote(issueType, input),
    preventTips: getPreventTips(issueType, input),
    platformNote: getPlatformNote(issueType, input),
    detectionNote: getDetectionNote(issueType, input),
    technicalDetail: getTechnicalDetail(issueType, input),
  };
}
