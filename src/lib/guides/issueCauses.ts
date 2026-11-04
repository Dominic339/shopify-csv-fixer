// src/lib/guides/issueCauses.ts
// Hand-written "Common causes" for the issue guides where the generated text alone says
// least: the variant and structure errors people search for. Each line is translated through
// src/i18n/guideText/<locale>.json like the rest of the generated guide.

export const ISSUE_CAUSES: Record<string, string[]> = {
  "shopify/invalid_handle": [
    "The handle was typed by hand with capitals, spaces or an ampersand, as in \"Linen Shirt & Tie\".",
    "Titles in other alphabets or with accents were copied into the handle column unchanged.",
    "A spreadsheet formula built the handle from the title and kept punctuation like apostrophes and slashes.",
  ],
  "shopify/duplicate_sku": [
    "Variants were created by copying a row and the SKU wasn't changed on the copy.",
    "Two products from different suppliers use the same supplier code as their SKU.",
    "Rows from two exports were merged, so the same variant appears twice.",
  ],
  "shopify/option_order_invalid": [
    "A product with one option had it typed into the Option2 columns, leaving Option1 empty.",
    "Columns were rearranged in a spreadsheet, so Option2 values ended up under a blank Option1.",
    "An option was removed from the product by clearing Option1 instead of the last option.",
  ],
  "shopify/variant_option_missing_value": [
    "Option names are filled on every row, but some variant rows were added without their size or colour.",
    "A value was deleted while editing, for example a size that was discontinued.",
    "The file was exported from another platform that keeps option values in a different column.",
  ],
  "shopify/option_name_inconsistent": [
    "One variant row says Colour and another says Color, so Shopify sees two different options.",
    "Option names were translated or retyped on some rows, for example Size and size.",
    "Two products accidentally share a handle, so their different options end up in one product.",
  ],
  "shopify/mixed_default_title_with_options": [
    "A product was first exported without variants, then rows with real options were added under the same handle.",
    "Rows from two exports of the same product were merged, one before and one after adding variants.",
    "Option1 value was left as Default Title on one row while the others list sizes or colours.",
  ],
  "woocommerce/missing_name": [
    "A parent variable product row was added without a Name, because the name was only filled on its variations.",
    "Names were stored in a column the importer doesn't map, such as Title or Product name.",
    "Rows were sorted, separating a product's name from the rest of its data.",
  ],
  "woocommerce/invalid_type": [
    "Type was filled with a description such as Product, Variable product or Simple product.",
    "Several types were combined in one cell, as in \"simple, downloadable\", instead of using the Downloadable and Virtual columns.",
    "The file came from another platform that uses its own product kinds.",
  ],
  "woocommerce/variation_missing_parent": [
    "Variation rows were exported from a plugin that leaves Parent empty and relies on row order instead.",
    "The parent was referenced by name rather than by its SKU or id:123.",
    "The parent row was deleted or filtered out of the file, so its variations point at nothing.",
  ],
  "woocommerce/variation_missing_attributes": [
    "The parent lists the sizes, but the variation rows were saved without their own Attribute 1 value(s).",
    "Attribute columns were renamed in a spreadsheet, so the importer no longer recognises them.",
    "A variation was meant to cover any size, which WooCommerce writes as a blank value on export but doesn't accept on every import.",
  ],
  "ebay/invalid_relationship_details": [
    "Values were separated with commas instead of semicolons, as in Color=Blue,Red.",
    "Name and value pairs were written with a colon, as in Color: Blue, instead of Color=Blue.",
    "The parent row lists the option names without any values.",
  ],
  "ebay/variation_without_parent": [
    "The file was sorted by SKU or price, which separated variation rows from their parent.",
    "The parent row was deleted while the variations were kept.",
    "A blank row was left between the parent and its variations.",
  ],
  "ebay/variation_value_not_in_parent": [
    "A new size or colour was added to a variation row but not to the parent's RelationshipDetails.",
    "The same value is spelled differently on the two rows, for example Grey and Gray.",
    "Capitalisation or spacing differs, as in X-Large and XL.",
  ],
  "ebay/variation_specifics_mismatch": [
    "Only VariationSpecificsName was filled, with the values left for later.",
    "The number of names and values differs, such as Color|Size with only Blue.",
    "One of the two columns was dropped when the file was copied from another template.",
  ],
  "etsy/invalid_price": [
    "The price was copied from a listing page with the currency sign, as in $24.00.",
    "A spreadsheet set to a European locale saved the price with a decimal comma, as in 24,00.",
    "A price range such as 18-24 was typed for a listing whose variations have different prices.",
  ],
  "etsy/missing_price": [
    "The listing has variations, and the prices were only entered on the variations in Shop Manager, so the export has none.",
    "Rows were added for listings still in draft, before a price was set.",
    "A formula that looked up prices from another sheet returned nothing for new SKUs.",
  ],
  "etsy/invalid_quantity": [
    "A note such as \"made to order\" or \"in stock\" was typed instead of a number.",
    "The quantity came from an inventory sheet that stores fractions, as in 2.5.",
    "A stock count went below zero after an oversold item and was copied as -1.",
  ],
  "ebay/invalid_price": [
    "StartPrice was written with the currency, as in $19.99 or 19.99 USD; the currency is set in the Action column header.",
    "Thousands were separated with a comma, as in 1,299.00.",
    "An auction-style \"best offer\" note was typed into the price cell.",
  ],
  "ebay/missing_price": [
    "On a listing with variations, the price was put on the parent row instead of on each Variation row, or the other way round.",
    "Rows meant only to revise one field (Action=Revise) were treated as new listings.",
    "The price column came from a template that calls it Price instead of *StartPrice.",
  ],
  "ebay/invalid_quantity": [
    "Quantity was filled on the parent row of a multi-variation listing, as text such as \"varies\".",
    "Stock was exported from a warehouse system with decimals or negative numbers.",
    "A spreadsheet turned an empty quantity into a dash or the word none.",
  ],
  "amazon/invalid_price": [
    "The price was pasted from Seller Central with the currency sign, as in $29.99.",
    "A European locale saved the price with a decimal comma, as in 29,99.",
    "The cell holds a note like \"see listing\" or a price range instead of one number.",
  ],
  "amazon/missing_price": [
    "The file was meant to update only quantity, but add-delete is a (add/update), which needs a price.",
    "Prices were kept in a separate repricing tool and never copied into the file.",
    "Rows for new offers were added before the price was decided.",
  ],
  "amazon/invalid_quantity": [
    "Quantity was filled for an offer fulfilled by Amazon (FBA), where Amazon counts stock itself, as text like \"FBA\".",
    "A stock count went negative after overselling and was copied as -2.",
    "The value came from an inventory sheet with decimals, such as cases of 0.5.",
  ],
  "shopify/handle_title_mismatch": [
    "Variant rows repeat the product title with the option added, as in \"Linen Shirt - Blue\"; only the first row needs the Title.",
    "Two different products were given the same handle, so Shopify would merge them into one.",
    "The title was edited on one row during a spreadsheet clean-up, but not on the others.",
  ],
  "shopify/blank_handle": [
    "Products were added by hand to the bottom of an export, and only the Title column was filled.",
    "A file from another platform has no handle column, so every row is blank.",
    "Variant rows were left with an empty handle, expecting Shopify to use the row above; it needs the handle on every row.",
  ],
};

/** The common causes for an issue code, or an empty list. */
export function issueCauses(code: string): string[] {
  return ISSUE_CAUSES[code] ?? [];
}
