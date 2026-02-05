import type { CsvFormat } from "./types";
import { generalCsvFormat } from "./builtins/general";
import { shopifyProductsFormat } from "./builtins/shopifyProducts";

export { applyFormatToParsedCsv, normalizeRowsSafe } from "./engine";
export type { CsvFormat, CsvRow, CsvIssue, CsvFixResult } from "./types";

const BUILTINS: CsvFormat[] = [generalCsvFormat, shopifyProductsFormat];

export function getAllBuiltinFormats() {
  return BUILTINS;
}

export function getFormatById(id: string): CsvFormat {
  return BUILTINS.find((f) => f.id === id) ?? generalCsvFormat;
}
