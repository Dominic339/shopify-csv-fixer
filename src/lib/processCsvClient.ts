// src/lib/processCsvClient.ts
// Browser entry point: process CSV text in a Web Worker when it is large,
// falling back to the main thread whenever a worker can't be used.

import { loadUserFormatsFromStorage } from "@/lib/formats/customUser";
import type { CsvFormat } from "@/lib/formats/types";
import {
  processCsvText,
  type FormatRef,
  type ProcessCsvOptions,
  type ProcessCsvResult,
} from "@/lib/processCsv";

/** Below this size the worker round-trip costs more than it saves. */
export const WORKER_MIN_CHARS = 256 * 1024;

type WorkerReply = { id: number; ok: true; result: ProcessCsvResult } | { id: number; ok: false; error: string };

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, { resolve: (r: ProcessCsvResult) => void; reject: (e: Error) => void }>();

function getWorker(): Worker | null {
  if (worker) return worker;
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  try {
    worker = new Worker(new URL("./processCsv.worker.ts", import.meta.url), { type: "module" });
  } catch {
    return null;
  }
  worker.onmessage = (e: MessageEvent<WorkerReply>) => {
    const p = pending.get(e.data.id);
    if (!p) return;
    pending.delete(e.data.id);
    if (e.data.ok) p.resolve(e.data.result);
    else p.reject(new Error(e.data.error));
  };
  worker.onerror = () => {
    // A crashed worker fails every in-flight request; callers fall back inline.
    for (const p of pending.values()) p.reject(new Error("CSV worker failed"));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

function formatRef(format: CsvFormat): FormatRef | null {
  if (format.source === "builtin") return { kind: "builtin", id: format.id };
  const spec = loadUserFormatsFromStorage().find((f) => f.id === format.id);
  return spec ? { kind: "user", spec } : null;
}

export async function processCsv(text: string, format: CsvFormat, opts: ProcessCsvOptions): Promise<ProcessCsvResult> {
  const ref = text.length >= WORKER_MIN_CHARS ? formatRef(format) : null;
  const w = ref ? getWorker() : null;

  if (w && ref) {
    const id = ++nextId;
    try {
      return await new Promise<ProcessCsvResult>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        w.postMessage({ id, text, format: ref, opts });
      });
    } catch {
      pending.delete(id);
      // Fall through to the main thread so the user still gets a result.
    }
  }

  return processCsvText(text, format, opts);
}
