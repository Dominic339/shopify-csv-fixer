import type { CsvFormat } from "./types";
import { shopifyProductsFormat } from "./builtins/shopifyProducts";
import { formatPackEcommerce } from "./builtins/packs";

// StriveFormats is currently focused on ecommerce imports only.
// Keep the format list intentionally small and high quality.
const BUILTINS: CsvFormat[] = [shopifyProductsFormat, ...formatPackEcommerce];

// AppClient.tsx expects this name
export function getAllFormats(): CsvFormat[] {
  return BUILTINS;
}

// Keep your existing export too (so nothing else breaks)
export function getAllBuiltinFormats(): CsvFormat[] {
  return BUILTINS;
}

export function getFormatById(id: string): CsvFormat {
  return BUILTINS.find((f) => f.id === id) ?? shopifyProductsFormat;
}
