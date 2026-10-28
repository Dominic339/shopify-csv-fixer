// src/lib/processCsv.worker.ts
// Runs CSV parsing + validation off the main thread so large files don't freeze the page.

import { processCsvText, resolveFormat, type FormatRef, type ProcessCsvOptions } from "@/lib/processCsv";

export type WorkerRequest = { id: number; text: string; format: FormatRef; opts: ProcessCsvOptions };

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, text, format, opts } = e.data;
  try {
    const resolved = resolveFormat(format);
    if (!resolved) throw new Error("Unknown format");
    self.postMessage({ id, ok: true, result: processCsvText(text, resolved, opts) });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
