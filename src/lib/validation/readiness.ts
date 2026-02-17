// src/lib/validation/readiness.ts
import type { CsvIssue } from "@/lib/formats/types";
import { getIssueMeta } from "@/lib/validation/issueMetaRegistry";

export type BlockingGroup = {
  code: string;
  title: string;
  count: number;
  firstRowIndex: number; // 0-based, -1 if file-level only
  autoFixableCount: number;
};

export type ReadinessSummary = {
  blockingErrors: number;
  autoFixableBlockingErrors: number;
  blockingGroups: BlockingGroup[];
};

export function computeReadinessSummary(issues: CsvIssue[], formatId?: string): ReadinessSummary {
  let blockingErrors = 0;
  let autoFixableBlockingErrors = 0;

  const groups = new Map<string, BlockingGroup>();

  for (const issue of issues) {
    if (issue.severity !== "error") continue;

    const meta = getIssueMeta(formatId, issue.code);
    const blocking = meta?.blocking ?? true; // default: errors are blocking unless explicitly non-blocking
    if (!blocking) continue;

    blockingErrors++;

    const autoFixable = Boolean(meta?.autoFixable) && issue.rowIndex >= 0;
    if (autoFixable) autoFixableBlockingErrors++;

    const code = issue.code ?? "unknown";
    const title = meta?.title ?? (code === "unknown" ? issue.message : code);

    const prev = groups.get(code);
    const rowIndex = typeof issue.rowIndex === "number" ? issue.rowIndex : -1;

    if (!prev) {
      groups.set(code, {
        code,
        title,
        count: 1,
        firstRowIndex: rowIndex,
        autoFixableCount: autoFixable ? 1 : 0,
      });
    } else {
      prev.count += 1;
      if (autoFixable) prev.autoFixableCount += 1;
      if (prev.firstRowIndex === -1 && rowIndex >= 0) prev.firstRowIndex = rowIndex;
      groups.set(code, prev);
    }
  }

  const blockingGroups = Array.from(groups.values()).sort((a, b) => b.count - a.count);

  return { blockingErrors, autoFixableBlockingErrors, blockingGroups };
}
