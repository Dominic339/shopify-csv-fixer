// src/lib/validation/checkCount.ts
import { ISSUE_META_REGISTRY } from "@/lib/validation/issueMetaRegistry";

/** Distinct import checks across the built-in formats (formats can share a rule set). */
export function countChecks(): number {
  // Each check once, even when presets share it (both WooCommerce presets, both eBay presets), and only checks that run.
  const codes = Object.values(ISSUE_META_REGISTRY).flatMap((checks) =>
    Object.entries(checks)
      .filter(([, m]) => m.checked !== false)
      .map(([code]) => code),
  );
  return new Set(codes).size;
}
