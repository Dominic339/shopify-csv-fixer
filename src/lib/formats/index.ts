import type { CsvFormat } from "./types";
import { generalCsvFormat } from "./builtins/general";
import { shopifyProductsFormat } from "./builtins/shopifyProducts";
import { builtinPackFormats } from "./builtins/packs";

const BUILTINS: CsvFormat[] = [generalCsvFormat, shopifyProductsFormat, ...builtinPackFormats];

export function getAllBuiltinFormats() {
  return BUILTINS;
}

export function getFormatById(id: string): CsvFormat {
  return BUILTINS.find((f) => f.id === id) ?? generalCsvFormat;
}
