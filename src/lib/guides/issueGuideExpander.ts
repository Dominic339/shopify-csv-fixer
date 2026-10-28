// src/lib/guides/issueGuideExpander.ts
// Deterministic content expansion for issue-based guide pages.
// No AI calls, no external dependencies -- pure derived data.
//
// Every sentence goes through `tr(template, values)`. English fills the {placeholders} in;
// other languages look the template up in src/i18n/guideText/<locale>.json first
// (see guideTextTranslator in src/lib/guides/localizeGuide.ts).

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

/**
 * English rule text. Classification and limits are read from it, so pass the English
 * rule even on translated pages (`localTitle` is the page's own title, used where no
 * column name is known).
 */
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
  localTitle?: string;
};

/** Fills a sentence template's {placeholders}, translating the template first if it can. */
export type Tr = (template: string, values?: Record<string, string | number>) => string;

export const fillTemplate = (template: string, values?: Record<string, string | number>) =>
  values ? template.replace(/\{(\w+)\}/g, (all, k: string) => (k in values ? String(values[k]) : all)) : template;

const englishTr: Tr = fillTemplate;

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

function extractColumnName(code: string, fallback: string, tr: Tr = englishTr): string {
  const suffix = code.includes("/") ? code.split("/").slice(1).join("/") : code;
  const col = COLUMN_NAME_MAP[suffix];
  // Real column names stay as they are; the one description is translated.
  return col === "the header row" ? tr(col) : (col ?? fallback);
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

function booleanValues(platform: string, tr: Tr): string[] {
  switch (platform) {
    case "shopify":
      return ["TRUE", "FALSE", tr("(blank -- treated as FALSE for most boolean fields)")];
    case "woocommerce":
      return [tr("1 (true)"), tr("0 (false)"), tr("(the fixer normalizes common variants like yes/no)")];
    case "amazon":
      return [tr("y  (lowercase, means true)"), tr("n  (lowercase, means false)")];
    default:
      return ["TRUE", "FALSE"];
  }
}

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

/** The character limit named in the rule's (English) explanation, if any. */
function charLimit(input: IssueInput): string | null {
  return input.explanation.match(/(\d+)\s*characters?/i)?.[1] ?? null;
}

function getValidValues(type: IssueType, input: IssueInput, tr: Tr): string[] | null {
  switch (type) {
    case "boolean":
      return booleanValues(input.platform, tr);
    case "money":
      return [
        tr("Positive decimal number -- e.g. 9.99, 100.00, 1999.95"),
        tr("Use a period (.) as the decimal separator, not a comma"),
        tr("No currency symbols ($, USD, GBP, EUR)"),
        tr("No thousand separators -- write 1000.00 not 1,000.00"),
        tr("Maximum 2 decimal places for most platforms"),
      ];
    case "inventory":
      return [
        tr("Whole number (integer), 0 or greater"),
        tr("No decimal places -- write 10 not 10.5"),
        tr("No negative values -- use 0 for out-of-stock items"),
      ];
    case "url":
      return [
        tr("Full URL starting with https:// or http://"),
        tr("Must be publicly accessible (no login required)"),
        tr("No spaces in the URL"),
      ];
    case "image":
      return [
        tr("Full URL starting with https:// or http://"),
        tr("Must be publicly accessible (no login required)"),
        tr("No spaces in the URL"),
        tr("Supported formats: JPG, PNG, WebP, GIF"),
        tr("Recommended: under 20 MB per image"),
      ];
    case "length_limit": {
      const limit = charLimit(input);
      return limit
        ? [tr("Maximum {limit} characters", { limit }), tr("Count includes spaces and punctuation")]
        : [tr("Check the platform's documented character limit"), tr("Use =LEN() in Excel to count characters")];
    }
    case "enum":
      return ENUM_BY_CODE[input.issueCode] ?? null;
    case "required_header":
      return [
        tr("All required column headers must appear in row 1 of the file"),
        tr("Column names are case-sensitive on most platforms"),
        tr("Missing columns must be added even if their values are blank"),
        tr("Use the official platform template as your starting point"),
      ];
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Bad vs good examples
// ---------------------------------------------------------------------------

function getExamples(type: IssueType, input: IssueInput, tr: Tr): Example[] {
  switch (type) {
    case "boolean":
      if (input.platform === "amazon") {
        return [
          { bad: "yes", good: "y", note: tr("Amazon uses lowercase y/n") },
          { bad: "TRUE", good: "y" },
          { bad: "No", good: "n" },
          { bad: "FALSE", good: "n" },
        ];
      }
      return [
        { bad: "yes", good: "TRUE", note: tr("Must be uppercase") },
        { bad: "1", good: "TRUE" },
        { bad: "No", good: "FALSE" },
        { bad: "0", good: "FALSE" },
        { bad: "True", good: "TRUE", note: tr("Mixed case not accepted") },
      ];
    case "money":
      return [
        { bad: "$29.99", good: "29.99", note: tr("Remove currency symbols") },
        { bad: "29,99", good: "29.99", note: tr("Use period as decimal separator") },
        { bad: "1,000.00", good: "1000.00", note: tr("Remove thousand separators") },
        { bad: "29.999", good: "29.99", note: tr("Max 2 decimal places") },
        { bad: "free", good: "0.00", note: tr("Must be numeric") },
      ];
    case "inventory":
      return [
        { bad: "10.5", good: "10", note: tr("Whole numbers only") },
        { bad: "-1", good: "0", note: tr("No negative values") },
        { bad: "ten", good: "10", note: tr("Must be numeric") },
        { bad: tr("(empty)"), good: "0", note: tr("Cannot be blank") },
      ];
    case "image":
    case "url":
      return [
        {
          bad: "products/shirt.jpg",
          good: "https://cdn.example.com/products/shirt.jpg",
          note: tr("Must be a full URL"),
        },
        {
          bad: "www.example.com/image.jpg",
          good: "https://www.example.com/image.jpg",
          note: tr("Must include https://"),
        },
        { bad: "C:/Users/me/image.jpg", good: "https://cdn.example.com/image.jpg", note: tr("No local file paths") },
        { bad: "https://example.com/my image.jpg", good: "https://example.com/my-image.jpg", note: tr("No spaces in URLs") },
      ];
    case "length_limit": {
      const m = charLimit(input);
      const lim = m ? parseInt(m, 10) : 80;
      return [
        {
          bad: `"${"x".repeat(lim + 15)}"`,
          good: `"${"x".repeat(lim - 5)}..."`,
          note: tr("Over {limit} characters vs within {limit}", { limit: lim }),
        },
      ];
    }
    case "enum": {
      const vals = ENUM_BY_CODE[input.issueCode];
      return vals && vals.length
        ? [{ bad: "other_value", good: vals[0], note: tr("Must be one of: {values}", { values: vals.slice(0, 3).join(", ") }) }]
        : [{ bad: "invalid_option", good: tr("(see valid values above)"), note: tr("Exact spelling required") }];
    }
    case "required_field":
      return [{ bad: tr("(empty cell)"), good: tr("Actual value for this field"), note: tr("Cannot be left blank") }];
    case "required_header":
      return [
        {
          bad: tr("Column absent from row 1"),
          good: tr("Column added to header row (can have blank values)"),
          note: tr("Header must exist even if data is blank"),
        },
      ];
    case "duplicate":
      return [
        {
          bad: tr("Row 3: SKU-001  Row 7: SKU-001"),
          good: tr("Row 3: SKU-001  Row 7: SKU-002"),
          note: tr("Each identifier must be unique"),
        },
        {
          bad: tr("PROD-A appears in rows 4 and 11"),
          good: tr("PROD-A appears once only"),
          note: tr("Unless rows are intentional parent/variant grouping"),
        },
      ];
    case "variant_structure":
      return [
        { bad: tr("Option2 filled but Option1 blank"), good: tr("Option1 filled first, then Option2") },
        { bad: tr("Variant row appears before its parent row"), good: tr("Parent row appears directly above variant rows") },
      ];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Excel step-by-step instructions
// ---------------------------------------------------------------------------

/** The true/false spellings a platform wants (Amazon: y/n). */
function boolSpellings(platform: string, tr: Tr) {
  const amazon = platform === "amazon";
  return {
    t: amazon ? "y" : "TRUE",
    f: amazon ? "n" : "FALSE",
    pair: amazon ? tr("y and n") : tr("TRUE and FALSE"),
  };
}

function getExcelSteps(type: IssueType, input: IssueInput, column: string, tr: Tr): string[] {
  const platform = platformDisplayName(input.platform, tr);
  const col = { column };
  switch (type) {
    case "required_header":
      return [
        tr("Download the official {platform} template from the Templates section of StriveFormats.", { platform }),
        tr("Open both your CSV and the downloaded template in Excel."),
        tr("Look at row 1 in both files -- this is the header row."),
        tr("Identify column names that appear in the template but are missing from your file."),
        tr("In your CSV, click the header of an empty column and type the missing column name exactly as it appears in the template (case-sensitive)."),
        tr("Leave the new column's cells blank if you have no data -- the column just needs to exist."),
        tr("Repeat for each missing column, then save as CSV (Comma delimited)."),
      ];
    case "boolean": {
      const { t, f, pair } = boolSpellings(input.platform, tr);
      return [
        tr("In Excel, click the column letter for the {column} column to select the entire column.", col),
        tr("Press Ctrl+H to open Find & Replace."),
        tr("In 'Find what', type: yes  --  in 'Replace with', type: {t}  --  check 'Match entire cell contents'  --  click Replace All.", { t }),
        tr("Repeat: no -> {f},  1 -> {t},  0 -> {f}.", { t, f }),
        tr("Also replace: True -> {t},  False -> {f}.", { t, f }),
        tr("Scan the column to confirm only {pair} remain (and blanks if allowed).", { pair }),
        tr("Save as CSV (Comma delimited)."),
      ];
    }
    case "money":
      return [
        tr("In Excel, click the column letter for the {column} column to select it.", col),
        tr("Press Ctrl+H (Find & Replace). In 'Find what', type: $  -- leave 'Replace with' blank  -- click Replace All. Repeat for the pound sign, euro sign, and any other currency prefix."),
        tr("Find: ,  (comma, for thousand separators like 1,000)  -- Replace with: (nothing). This converts 1,000.00 to 1000.00."),
        tr("Right-click the selected column, choose 'Format Cells', select 'Number', set Decimal places to 2, click OK."),
        tr("Scroll through the column and verify values look like 9.99 or 1000.00 with no symbols."),
        tr("Save as CSV (Comma delimited)."),
      ];
    case "inventory":
      return [
        tr("In Excel, click the column letter for the {column} column.", col),
        tr("Right-click and choose 'Format Cells'. Select 'Number', set Decimal places to 0, click OK."),
        tr("Use Data > Filter on this column. Filter where value is less than 0 and change those cells to 0."),
        tr("Also filter for non-numeric values (text cells) and enter the correct whole number."),
        tr("Save as CSV (Comma delimited)."),
      ];
    case "required_field":
      return [
        tr("In Excel, click the header letter of the {column} column to select it.", col),
        tr("Press Ctrl+G (Go To) -- click 'Special' -- select 'Blanks' -- click OK. Excel selects all empty cells in that column."),
        tr("Type the required value and press Ctrl+Enter to fill all selected blank cells at once."),
        tr("If different rows need different values: use Data > Filter on the column, filter for '(Blanks)', and fill each row manually."),
        tr("Save as CSV (Comma delimited)."),
      ];
    case "url":
    case "image":
      return [
        tr("In Excel, click the column letter for the {column} column.", col),
        tr("Press Ctrl+H. Find: http://  -- Replace with: https://  -- Replace All. This upgrades insecure URLs."),
        tr("Scan the column for cells that start with // or just a filename like 'shirt.jpg'. Add https:// in front of each."),
        tr("Find: ' ' (a space character)  -- Replace with: -  -- Replace All. This removes spaces from URLs."),
        tr("Click a sample URL and press F5, or paste it into a browser, to confirm the image or page loads correctly."),
        tr("Save as CSV (Comma delimited)."),
      ];
    case "length_limit": {
      const limit = charLimit(input) ?? tr("the limit");
      return [
        tr("In Excel, right-click the column header next to {column} and choose 'Insert' to add a blank helper column.", col),
        tr("In the first data row of the helper column, type: =LEN(X2)  -- replace X2 with the actual cell reference of your {column} column.", col),
        tr("Copy this formula down to all rows by double-clicking the fill handle (the small square in the cell's bottom-right corner)."),
        tr("Go to Data > Filter. On the helper column, use a number filter for 'Greater Than {limit}'.", { limit }),
        tr("For each flagged row, click into the original column's cell and shorten the text until the helper column shows a number at or below the limit."),
        tr("When done, select the helper column, right-click, and choose Delete. Save as CSV (Comma delimited)."),
      ];
    }
    case "enum": {
      const vals = ENUM_BY_CODE[input.issueCode];
      const values = vals ? vals.slice(0, 4).join(", ") : tr("the allowed values listed above");
      return [
        tr("In Excel, click the column letter for the {column} column.", col),
        tr("Press Ctrl+H. In 'Find what', type the invalid value -- in 'Replace with', type the correct accepted value -- Replace All."),
        tr("The accepted values are: {values}.", { values }),
        tr("To prevent future errors, add a dropdown: select the column, go to Data > Data Validation, choose 'List', and enter the valid options separated by commas."),
        tr("Save as CSV (Comma delimited)."),
      ];
    }
    case "duplicate":
      return [
        tr("In Excel, click the column letter for the {column} column.", col),
        tr("Go to Home > Conditional Formatting > Highlight Cell Rules > Duplicate Values. Duplicate cells will be highlighted in red."),
        tr("For each highlighted pair, decide which row to keep. Either delete the duplicate row, or change its identifier to something unique."),
        tr("After resolving all duplicates, clear the conditional formatting: Home > Conditional Formatting > Clear Rules > Clear Rules from Selected Cells."),
        tr("Save as CSV (Comma delimited)."),
      ];
    case "variant_structure":
      return [
        tr("In Excel, sort your rows by the parent identifier column (Handle for Shopify, parent SKU for WooCommerce)."),
        tr("Verify the parent row appears before all its variant rows in the sorted result."),
        tr("For WooCommerce: parent rows should have Type = 'variable'. Variation rows should have Type = 'variation' and the Parent column set to the parent's SKU."),
        tr("For Shopify: all rows in a product group must share the same Handle. Check that Option1 Name is filled before Option2 Name."),
        tr("Save as CSV (Comma delimited)."),
      ];
    default:
      return [
        tr("Review the {column} column for incorrect values.", col),
        tr("Fix any cells that do not match the expected format."),
        tr("Save as CSV (Comma delimited)."),
      ];
  }
}

// ---------------------------------------------------------------------------
// Google Sheets step-by-step instructions
// ---------------------------------------------------------------------------

function getSheetsSteps(type: IssueType, input: IssueInput, column: string, tr: Tr): string[] {
  const platform = platformDisplayName(input.platform, tr);
  const col = { column };

  switch (type) {
    case "required_header":
      return [
        tr("Download the official {platform} template from the Templates section of StriveFormats.", { platform }),
        tr("Open both files in Google Sheets (drag and drop onto drive.google.com, or File > Import in an existing sheet)."),
        tr("Compare row 1 in both files. Note any column names present in the template but absent in your file."),
        tr("Add the missing column names to row 1 of your file, exactly as they appear in the template (case-sensitive)."),
        tr("Leave the new column's cells blank if you have no data -- the header must exist."),
        tr("Go to File > Download > Comma Separated Values (.csv)."),
      ];
    case "boolean": {
      const { t, f, pair } = boolSpellings(input.platform, tr);
      return [
        tr("In Google Sheets, click the column letter for the {column} column to select the whole column.", col),
        tr("Press Ctrl+H to open Find & Replace."),
        tr("Set Find: yes  --  Replace with: {t}  --  check 'Match entire cell contents'  --  Replace All.", { t }),
        tr("Repeat: no -> {f},  1 -> {t},  0 -> {f},  True -> {t},  False -> {f}.", { t, f }),
        tr("Verify only {pair} remain in the column.", { pair }),
        tr("Go to File > Download > Comma Separated Values (.csv)."),
      ];
    }
    case "money":
      return [
        tr("In Google Sheets, click the column letter for the {column} column.", col),
        tr("Press Ctrl+H. Find: $  -- Replace with: (empty)  -- Replace All. Repeat for the pound sign and euro sign."),
        tr("Find: ,  (the comma used in thousand separators like 1,000)  -- Replace with: (empty)  -- Replace All."),
        tr("Select the column again. Go to Format > Number > Number to ensure cells are treated as numbers."),
        tr("Verify all prices look like 9.99 or 1000.00 with no symbols."),
        tr("Go to File > Download > Comma Separated Values (.csv)."),
      ];
    case "inventory":
      return [
        tr("In Google Sheets, click the column letter for the {column} column.", col),
        tr("Go to Format > Number > Number and set decimal places to 0 (integers only)."),
        tr("In a blank helper column, enter =MOD(A2,1) (replace A2 with your column) and copy it down. Rows showing non-zero have decimal values -- round them manually."),
        tr("Delete the helper column when done."),
        tr("Go to File > Download > Comma Separated Values (.csv)."),
      ];
    case "required_field":
      return [
        tr("In Google Sheets, click the header of the {column} column.", col),
        tr("Go to Data > Create a filter."),
        tr("Click the filter icon on the column header, clear all checkboxes, then check '(Blanks)'. This shows only empty rows."),
        tr("Fill in the required value for each blank cell shown."),
        tr("Remove the filter: Data > Remove filter."),
        tr("Go to File > Download > Comma Separated Values (.csv)."),
      ];
    case "url":
    case "image":
      return [
        tr("In Google Sheets, select the {column} column.", col),
        tr("Press Ctrl+H. Find: http://  -- Replace with: https://  -- Replace All."),
        tr("Scan the column for cells starting with // or just a filename. Add https:// in front manually."),
        tr("Find: ' ' (a space)  -- Replace with: -  -- Replace All to clean up any spaces in URLs."),
        tr("Paste a sample URL into a new browser tab to confirm it loads correctly."),
        tr("Go to File > Download > Comma Separated Values (.csv)."),
      ];
    case "length_limit": {
      const limit = charLimit(input) ?? tr("the limit");
      return [
        tr("In Google Sheets, click the column letter next to {column} and insert a blank column (right-click > Insert 1 column left/right).", col),
        tr("In the first data row of the helper column, enter: =LEN(X2)  -- replace X2 with the cell reference for your {column} column.", col),
        tr("Copy the formula down to cover all data rows."),
        tr("Go to Data > Create a filter on the helper column. Use the filter to show only rows where the value is greater than {limit}.", { limit }),
        tr("For each flagged row, shorten the original column's text until the helper column shows a number at or below the limit."),
        tr("Delete the helper column. Go to File > Download > Comma Separated Values (.csv)."),
      ];
    }
    case "enum": {
      const vals = ENUM_BY_CODE[input.issueCode];
      const values = vals ? vals.slice(0, 4).join(", ") : tr("the allowed values listed above");
      return [
        tr("In Google Sheets, select the {column} column.", col),
        tr("Press Ctrl+H. Find the invalid value -- Replace with the correct accepted value -- Replace All."),
        tr("Accepted values: {values}.", { values }),
        tr("To add a validation dropdown: select the column, go to Data > Data Validation, choose 'Dropdown (from a list)', and enter the valid options."),
        tr("Go to File > Download > Comma Separated Values (.csv)."),
      ];
    }
    case "duplicate":
      return [
        tr("In Google Sheets, click the column letter for the {column} column.", col),
        tr("Go to Format > Conditional formatting. Set 'Format rules' to 'Custom formula is' and enter: =COUNTIF($A:$A,A1)>1  -- replace A with your column letter."),
        tr("Set a highlight color (e.g., red fill) and click Done. Duplicate values will be highlighted."),
        tr("For each highlighted cell, either delete the duplicate row or assign it a unique identifier."),
        tr("Remove the conditional formatting rule when done."),
        tr("Go to File > Download > Comma Separated Values (.csv)."),
      ];
    case "variant_structure":
      return [
        tr("In Google Sheets, go to Data > Sort range and sort by the parent identifier column (Handle or Parent SKU)."),
        tr("Verify parent rows appear directly before their variant rows."),
        tr("For WooCommerce: parent rows need Type = 'variable'. Variation rows need Type = 'variation' and Parent = the parent SKU."),
        tr("For Shopify: all variant rows in a product group must share the same Handle."),
        tr("Go to File > Download > Comma Separated Values (.csv)."),
      ];
    default:
      return [
        tr("Review the {column} column for incorrect values.", col),
        tr("Correct any cells that do not match the expected format."),
        tr("Go to File > Download > Comma Separated Values (.csv)."),
      ];
  }
}

// ---------------------------------------------------------------------------
// StriveFormats note
// ---------------------------------------------------------------------------

function getStriveNote(type: IssueType, input: IssueInput, tr: Tr): string {
  if (input.autoFixable) {
    switch (type) {
      case "boolean":
        return tr("Auto-fix normalizes common boolean variants (yes/no, 1/0, True/False) to the platform's exact required format. Upload your CSV and click Fix Issues.");
      case "required_header":
        return tr("Auto-fix adds all missing required column headers in one click. The added columns will be blank -- add your data into them.");
      case "money":
        return tr("Auto-fix removes common currency symbols and normalizes price format. Upload and click Fix Issues.");
      default:
        return tr("This issue is auto-fixable. Upload your CSV and click Fix Issues to apply all safe corrections at once.");
    }
  }
  switch (type) {
    case "required_field":
      return tr("StriveFormats flags every row where this required field is blank, so you can find and fill them quickly.");
    case "duplicate":
      return tr("StriveFormats highlights all rows with duplicate identifiers so you can see exactly which rows conflict.");
    case "length_limit":
      return tr("StriveFormats flags every row where the value exceeds the platform limit so you know exactly which cells to shorten.");
    case "variant_structure":
      return tr("StriveFormats detects variant structure issues and highlights the rows that are misaligned or missing required option values.");
    default:
      return tr("Upload your CSV to StriveFormats to detect this issue across all rows, with clear line-by-line reporting.");
  }
}

// ---------------------------------------------------------------------------
// Prevention tips
// ---------------------------------------------------------------------------

function getPreventTips(type: IssueType, input: IssueInput, tr: Tr): string[] {
  const isAmazon = input.platform === "amazon";
  switch (type) {
    case "boolean":
      return [
        isAmazon
          ? tr("Always type y or n (lowercase) -- do not use spreadsheet checkboxes; export them as text instead.")
          : tr("Always type TRUE or FALSE (all caps) -- do not use spreadsheet checkboxes; export them as text instead."),
        tr("If you export data from the platform's own admin panel, do not modify boolean columns in Excel -- autocorrect can silently change the values."),
        tr("Set the cell format to Text in Excel before pasting boolean values to prevent automatic conversion."),
        tr("Use StriveFormats auto-fix as a final pass before every import."),
      ];
    case "money":
      return [
        tr("Always format price cells as Number (2 decimal places), not Currency, in Excel."),
        tr("Never copy prices from a webpage or PDF -- they often include currency symbols or use commas as decimal separators."),
        tr("Use a period (.) as the decimal separator regardless of your computer's regional settings."),
        tr("Avoid using SUM() or other formula results in price cells -- use Paste Special > Values to paste plain numbers."),
        tr("Run every file through StriveFormats before importing to catch formatting issues early."),
      ];
    case "required_field":
      return [
        tr("Start from the official platform template so you know which fields are required from the start."),
        tr("Before exporting, run a quick filter on each required column and check for blanks."),
        tr("Test with a small 5-row sample CSV before uploading your full catalog."),
        tr("If a required field is conditional (required only for certain product types), still include the column -- just leave non-applicable rows blank."),
      ];
    case "required_header":
      return [
        tr("Always start from the official platform template, never a blank spreadsheet."),
        tr("After building your file, compare your header row to the template side-by-side before exporting."),
        tr("Keep a saved copy of the correct header row as a reference for future files."),
        tr("Run every new file through StriveFormats to verify headers match the platform's requirements."),
      ];
    case "url":
    case "image":
      return [
        tr("Always use the full URL starting with https://. Never use relative paths or local file paths."),
        tr("Before importing, paste a sample image URL into a browser to confirm it loads correctly."),
        tr("Host all images on a reliable CDN or cloud storage before adding URLs to your CSV."),
        tr("Avoid URL query parameters unless the platform explicitly supports them."),
        tr("Keep image files under 20 MB and use standard formats: JPG, PNG, or WebP."),
      ];
    case "length_limit":
      return [
        tr("Know the platform's character limits before writing titles and descriptions."),
        tr("Use =LEN() in Excel or Google Sheets to count characters as you type."),
        tr("Focus on high-impact keywords rather than full sentences in title fields."),
        tr("Review titles for length before exporting -- it is much faster to fix them in the source sheet."),
      ];
    case "enum":
      return [
        tr("Copy-paste allowed values directly from the official template to avoid typos."),
        tr("Use Excel Data Validation or Google Sheets Data Validation to restrict the column to a dropdown of allowed values."),
        tr("Check the platform's official documentation for the current list of allowed values -- they can change."),
      ];
    case "duplicate":
      return [
        tr("Define a clear naming convention for SKUs and identifiers before adding products."),
        tr("Use a prefix system (e.g., SHIRTS-001) to keep identifiers organized and unique."),
        tr("Before exporting, sort by the identifier column and scan for consecutive identical values."),
        tr("Understand the difference between intentional duplicate parent identifiers (variant grouping) and accidental duplicates."),
        tr("Run StriveFormats before every import to catch duplicates early."),
      ];
    case "variant_structure":
      return [
        tr("Always keep parent product rows directly above all their variant rows."),
        tr("For Shopify: use the same Handle value for all rows in one product group."),
        tr("For WooCommerce: parent rows have Type = variable; child rows have Type = variation with Parent = parent SKU."),
        tr("Test with a single product (one parent, two to three variants) before importing your full catalog."),
      ];
    case "inventory":
      return [
        tr("Export quantity data from your inventory system as whole numbers."),
        tr("Use 0 for out-of-stock items -- do not leave the quantity blank."),
        tr("Never copy-paste quantity data from a financial system that uses decimal places."),
      ];
    default:
      return [
        tr("Start from the official platform template to avoid structural issues."),
        tr("Run your file through StriveFormats before every import."),
        tr("Test with a small sample file first to catch errors before they affect your full catalog."),
      ];
  }
}

// ---------------------------------------------------------------------------
// Platform-specific notes
// ---------------------------------------------------------------------------

function platformDisplayName(platform: string, tr: Tr = englishTr): string {
  const N: Record<string, string> = {
    shopify: "Shopify",
    woocommerce: "WooCommerce",
    etsy: "Etsy",
    ebay: "eBay",
    amazon: "Amazon",
  };
  return platform === "general" ? tr("the platform") : (N[platform] ?? platform);
}

function getPlatformNote(type: IssueType, input: IssueInput, tr: Tr): string | null {
  const { platform, issueCode } = input;

  if (type === "boolean") {
    if (platform === "shopify")
      return tr("Shopify requires TRUE or FALSE in all caps. A blank cell is treated as FALSE for most boolean fields. Do not use Yes, No, 1, or 0 -- Shopify's importer will reject them.");
    if (platform === "amazon")
      return tr("Amazon flat files use lowercase y for true and lowercase n for false. This is different from most other platforms that use TRUE/FALSE.");
    if (platform === "woocommerce")
      return tr("WooCommerce Product CSV supports 1 and 0 as well as yes and no for boolean fields. The StriveFormats fixer normalizes these to the correct format automatically.");
  }

  if (type === "enum" && issueCode.includes("category_id"))
    return tr("eBay CategoryIDs are numeric codes from eBay's category taxonomy. Find the ID by browsing eBay to the correct category and looking at the number in the URL (e.g., /b/.../{id}), or by using the eBay Category Lookup API. Using the wrong category ID causes listings to be placed in the wrong section or rejected entirely.");

  if (type === "variant_structure" && platform === "woocommerce")
    return tr("WooCommerce distinguishes between variable products (parent rows, Type = 'variable') and variation rows (Type = 'variation', Parent = parent SKU). The Parent column in variation rows must match the SKU of the parent row exactly, including case.");

  if (type === "variant_structure" && platform === "shopify")
    return tr("Shopify groups variant rows by the Handle column value. All rows sharing the same Handle belong to the same product. Option columns (Option1 Name, Option1 Value, etc.) must be consistent across every variant row in the group.");

  if (platform === "amazon" && type === "required_header")
    return tr("Amazon flat file column names vary by product category template (electronics, clothing, etc.). Always download the exact template for your category from Seller Central > Catalog > Add Products via Upload > Download an inventory file template.");

  if (platform === "ebay" && type === "required_field" && issueCode.includes("title"))
    return tr("eBay has a strict 80-character limit on listing titles. Titles that are too long or missing cause the entire row to be rejected during upload.");

  return null;
}

// ---------------------------------------------------------------------------
// How StriveFormats detects this issue
// ---------------------------------------------------------------------------

function getDetectionNote(type: IssueType, input: IssueInput, column: string, tr: Tr): string {
  const v = { platform: platformDisplayName(input.platform, tr), column };
  switch (type) {
    case "boolean":
      return tr(`StriveFormats reads every cell in the {column} column and checks it against {platform}'s accepted boolean values. Any value that does not match exactly -- including mixed-case variants like "True" or "Yes" -- is flagged as an error.`, v);
    case "required_header":
      return tr("StriveFormats compares your file's header row (row 1) against the full set of required columns for the {platform} format. Any column name from the required list that is absent triggers this issue.", v);
    case "required_field":
      return tr("StriveFormats scans every row for blank or whitespace-only cells in the {column} column. Rows where this field is empty are flagged because {platform} requires a value on every row.", v);
    case "money":
      return tr("StriveFormats validates the {column} column by checking that each non-empty cell parses as a positive decimal number. Values containing currency symbols, commas, or non-numeric characters are flagged.", v);
    case "inventory":
      return tr("StriveFormats validates the {column} column by verifying that each cell is a non-negative whole number. Decimal values, negative numbers, text strings, and blank cells are all flagged.", v);
    case "url":
    case "image":
      return tr("StriveFormats checks the {column} column by verifying that each non-empty value begins with http:// or https:// and does not contain spaces. Values that look like relative paths or local filenames are also flagged.", v);
    case "length_limit":
      return tr("StriveFormats measures the character length of every cell in the {column} column and compares it against {platform}'s documented limit. Rows exceeding the limit are individually flagged with the actual character count.", v);
    case "enum":
      return tr("StriveFormats checks the {column} column against the exact list of accepted values for {platform}. The comparison is case-sensitive -- any casing variation or typo is flagged as an invalid value.", v);
    case "duplicate":
      return tr("StriveFormats builds a frequency map of all values in the {column} column as it parses the file. Any value that appears more than once is flagged on every row where it occurs.", v);
    case "variant_structure":
      return tr("StriveFormats groups rows by their parent identifier (Handle for {platform}) and checks that the structure matches the platform's variant model. Orphaned variation rows, missing parent rows, and duplicate option combinations are each flagged separately.", v);
    case "seo":
      return tr("StriveFormats checks SEO fields for common quality issues: blank values, excessive length, values that match the product title exactly (no differentiation), and placeholder text.");
    default:
      return tr("StriveFormats parses every row of your CSV and applies {platform}-specific validation rules to the {column} field. Any row that violates the rule is flagged with the row number and the specific value that caused the issue.", v);
  }
}

function getTechnicalDetail(type: IssueType, input: IssueInput, column: string, tr: Tr): string {
  const v = { platform: platformDisplayName(input.platform, tr), column };
  switch (type) {
    case "boolean":
      if (input.platform === "amazon")
        return tr(`Amazon flat files require the literal lowercase strings "y" and "n" for boolean fields. This differs from most other platforms. Spreadsheet applications often export boolean cells as "TRUE"/"FALSE", "Yes"/"No", or "1"/"0", none of which Amazon's importer accepts. Even a correctly-spelled "Y" (uppercase) will be rejected because Amazon's parser is case-sensitive for these values.`);
      if (input.platform === "woocommerce")
        return tr(`WooCommerce's CSV importer accepts "1" for true and "0" for false. Some export tools produce "yes", "no", "TRUE", or "FALSE" instead. Although WooCommerce's built-in importer handles some of these variants, third-party migration tools and staging environments often do not -- so using the canonical "1"/"0" form avoids surprises across all toolchains.`);
      return tr(`{platform}'s importer performs an exact, case-sensitive match on boolean fields. Only the uppercase strings TRUE and FALSE are accepted. Spreadsheet applications commonly produce alternative representations: Excel exports checkbox cells as TRUE/FALSE (which works), but "true" (lowercase), "Yes", "1", or "checked" will all fail. The blank value is treated as FALSE for most boolean fields, so leaving optional boolean fields empty is safe.`, v);
    case "required_header":
      return tr(`{platform}'s importer parses the first row of the CSV as the header row before processing any data. If a required column name is absent from that row, the importer has no column to write data into -- it cannot infer missing columns from content. Column names are matched exactly (case-sensitive on most platforms), so "variant price" will not satisfy a requirement for "Variant Price".`, v);
    case "money":
      return tr(`{platform}'s importer expects prices as plain decimal numbers. Currency symbols ($, £, €), thousand separators (1,000.00), and comma decimal separators (19,99) all cause the importer to treat the value as text rather than a number, resulting in a zero price, an import error, or a rejected row depending on the platform. Spreadsheet applications frequently auto-format price cells with currency symbols when the cell is formatted as "Currency" or "Accounting" rather than "Number".`, v);
    case "inventory":
      return tr("{platform}'s importer expects inventory quantities as whole numbers (integers). Decimal values like 10.5 are rejected or silently truncated depending on the platform version. Negative values are also rejected -- use 0 for out-of-stock items. A common source of this issue is copying quantity data from accounting software that stores stock levels as decimals for partial unit tracking.", v);
    case "url":
    case "image":
      return tr(`{platform}'s importer fetches image URLs at import time (or at product display time). The URL must be a fully-qualified address starting with http:// or https:// so the importer can locate the resource. Relative paths (like "images/shirt.jpg") are interpreted as relative to nothing, since the platform has no base path context from your local machine. Spaces in URLs must be encoded as %20 or replaced with hyphens -- most CDNs reject URLs with literal space characters.`, v);
    case "length_limit": {
      const limit = charLimit(input) ?? tr("the documented limit");
      return tr("{platform} enforces a {limit}-character limit on the {column} field. This limit exists because the platform stores and indexes the value in a fixed-width database column or a search index with a maximum token size. Values exceeding the limit are either silently truncated (causing your data to appear differently on the storefront) or the entire row is rejected. The character count includes all spaces, punctuation, and special characters -- it is not a word count.", { ...v, limit });
    }
    case "enum":
      return tr(`{platform}'s importer validates this field against a fixed list of accepted values defined in its import specification. These values are often short codes that map to internal states -- for example, "active"/"draft" map to product visibility states. The match is case-sensitive and exact: an extra space, a different casing, or a synonym (like "enabled" instead of "active") will cause the value to be rejected. The allowed values can change between platform versions, so always refer to the most recent template.`, v);
    case "duplicate":
      return tr("{platform} uses certain column values (like Handle, SKU, or Listing ID) as unique identifiers to decide whether to create a new record or update an existing one. When the same identifier appears more than once in the file, the importer's behavior depends on the platform: Shopify merges rows with the same Handle into one product (intentional for variants), while duplicate SKUs on separate products or duplicate Listing IDs on Etsy cause unexpected overwrites. Understanding whether a duplicate is intentional (variant grouping) or accidental is key to resolving this issue correctly.", v);
    case "variant_structure":
      if (input.platform === "shopify")
        return tr("Shopify groups product rows by the Handle column value. All rows sharing a Handle are treated as variants of the same product. The first row of a group must contain the product-level fields (Title, Body, Vendor). Subsequent rows for the same Handle only need variant-level fields (Option values, Price, SKU). If Option columns are inconsistent between rows in a group -- for example, Option1 Name changes between variant rows -- Shopify will create duplicate or broken variants, or reject the import.");
      if (input.platform === "woocommerce")
        return tr(`WooCommerce's variable product model requires a strict two-tier structure. Parent rows must have Type = "variable" and define the product-level data. Variation rows must have Type = "variation" and a Parent value matching the SKU of the parent row exactly (case-sensitive). A variation row with no matching parent is an orphan -- WooCommerce will either skip it or create a broken variation with no parent product. The parent SKU must exist in the same file or already be present in the store.`);
      return tr("{platform} requires parent product rows to appear before their child/variation rows, with a specific column value linking child rows to their parent. Rows that reference a parent that does not exist in the file will be treated as orphans and either skipped or imported incorrectly.", v);
    default:
      return tr("{platform}'s importer validates the {column} field against its official import specification. Values that do not meet the expected format are flagged to prevent silent data corruption -- an invalid value that slips through import might appear as a blank field, a zero, or incorrect text in your storefront without any error message after the fact.", v);
  }
}

// ---------------------------------------------------------------------------
// Main expand function
// ---------------------------------------------------------------------------

export function expandIssueContent(input: IssueInput, tr: Tr = englishTr): ExpandedIssueContent {
  const issueType = classifyIssue(input);
  const column = extractColumnName(input.issueCode, input.localTitle ?? input.title, tr);
  return {
    issueType,
    whereItAppears: column,
    validValues: getValidValues(issueType, input, tr),
    examples: getExamples(issueType, input, tr),
    excelSteps: getExcelSteps(issueType, input, column, tr),
    sheetsSteps: getSheetsSteps(issueType, input, column, tr),
    striveNote: getStriveNote(issueType, input, tr),
    preventTips: getPreventTips(issueType, input, tr),
    platformNote: getPlatformNote(issueType, input, tr),
    detectionNote: getDetectionNote(issueType, input, column, tr),
    technicalDetail: getTechnicalDetail(issueType, input, column, tr),
  };
}
