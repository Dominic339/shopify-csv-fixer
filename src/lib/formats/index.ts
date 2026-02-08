import type { CsvFormat } from "./types";
import { generalCsvFormat } from "./builtins/general";
import { shopifyProductsFormat } from "./builtins/shopifyProducts";
import { builtinPackFormats } from "./builtins/packs";

const BUILTINS: CsvFormat[] = [generalCsvFormat, shopifyProductsFormat, ...builtinPackFormats];

// Backward-compatible name (AppClient.tsx expects this)
export function getAllFormats(): CsvFormat[] {
  return BUILTINS;
}

// Preferred explicit name
export function getAllBuiltinFormats(): CsvFormat[] {
  return BUILTINS;
}

export function getFormatById(id: string): CsvFormat {
  return BUILTINS.find((f) => f.id === id) ?? generalCsvFormat;
}
