import type { CsvFormat } from "./types";
import { generalCsvFormat } from "./builtins/general";
import { shopifyProductsFormat } from "./builtins/shopifyProducts";
import { formatPackEcommerce } from "./builtins/packs";

// Ecommerce-first scope: only ship Ecommerce formats in the initial release.
// (Other category packs remain defined in packs.ts for later expansion.)
export const builtinPackFormats: CsvFormat[] = [...formatPackEcommerce];

const BUILTINS: CsvFormat[] = [generalCsvFormat, shopifyProductsFormat, ...builtinPackFormats];

// AppClient.tsx expects this name
export function getAllFormats(): CsvFormat[] {
  return BUILTINS;
}

// Keep your existing export too (so nothing else breaks)
export function getAllBuiltinFormats(): CsvFormat[] {
  return BUILTINS;
}

export function getFormatById(id: string): CsvFormat {
  return BUILTINS.find((f) => f.id === id) ?? generalCsvFormat;
}
