// src/lib/processCsv.ts
// Parse CSV text and run a format over it. Shared by the main thread and the
// CSV Web Worker, so it must not touch window/document.

import { parseCsv } from "@/lib/csv";
import { getAllFormats } from "@/lib/formats";
import { applyFormatToParsedCsv } from "@/lib/formats/engine";
import { userFormatToCsvFormat, type UserFormatV1 } from "@/lib/formats/customUser";
import type { CsvFixResult, CsvFormat } from "@/lib/formats/types";
import { setStrictModeOverride } from "@/lib/validation/strictMode";

/** A serializable reference to a format (CsvFormat itself holds functions). */
export type FormatRef = { kind: "builtin"; id: string } | { kind: "user"; spec: UserFormatV1 };

export type ProcessCsvOptions = { strictShopify: boolean };

export type ProcessCsvResult = CsvFixResult & { parseErrors: string[] };

export function resolveFormat(ref: FormatRef): CsvFormat | null {
  if (ref.kind === "user") return userFormatToCsvFormat(ref.spec);
  return getAllFormats().find((f) => f.id === ref.id) ?? null;
}

export function processCsvText(text: string, format: CsvFormat, opts: ProcessCsvOptions): ProcessCsvResult {
  setStrictModeOverride(opts.strictShopify);
  try {
    const parsed = parseCsv(text);
    const res = applyFormatToParsedCsv(parsed.headers, parsed.rows, format);
    return { ...res, parseErrors: parsed.parseErrors ?? [] };
  } finally {
    setStrictModeOverride(null);
  }
}
