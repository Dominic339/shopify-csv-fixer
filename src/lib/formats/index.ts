import type { CsvFormat } from "./types";
import { generalCsvFormat } from "./builtins/general";
import { shopifyProductsFormat } from "./builtins/shopifyProducts";
import {
  formatPackEcommerce,
  formatPackMarketing,
  formatPackCrm,
  formatPackAccounting,
  formatPackShipping,
  formatPackSupport,
} from "./builtins/packs";

export const builtinPackFormats: CsvFormat[] = [
  ...formatPackEcommerce,
  ...formatPackMarketing,
  ...formatPackCrm,
  ...formatPackAccounting,
  ...formatPackShipping,
  ...formatPackSupport,
];

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
