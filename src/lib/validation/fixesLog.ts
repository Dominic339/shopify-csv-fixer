// src/lib/validation/fixesLog.ts
// Utilities for grouping, summarising, and downloading fixesApplied logs.

export type FixGroup = {
  /** Short human-readable label for this fix type */
  type: string;
  /** Number of individual fix actions in this group */
  count: number;
  /** One representative example message */
  sample: string;
};

/**
 * Categorise a single fix message into a normalised type label.
 * The rules are intentionally broad so new fix messages auto-land in
 * a sensible bucket without requiring explicit registration.
 */
function classifyFix(msg: string): string {
  const m = msg.toLowerCase();

  // Header / template level
  if (m.includes("shopify:") || m.includes("header name") || m.includes("template")) return "Header normalisation";
  if (m.includes("canonical") || m.includes("canonicalized")) return "Header normalisation";
  if (m.includes("enforced")) return "Header normalisation";

  // Handle / URL
  if (m.includes("url handle") || m.includes("handle")) return "URL handle";

  // Booleans: Published, Charge tax, Requires shipping, Gift card
  if (
    m.includes("published") ||
    m.includes("charge tax") ||
    m.includes("requires shipping") ||
    m.includes("gift card")
  )
    return "Boolean fields";

  // Status / visibility
  if (m.includes("status") || m.includes("visibility")) return "Status / visibility";

  // Pricing fields
  if (m.includes("price") || m.includes("cost per item")) return "Price fields";

  // Inventory
  if (m.includes("inventory") || m.includes("stock") || m.includes("continue selling")) return "Inventory";

  // Options / variants
  if (m.includes("option") || m.includes("variant") || m.includes("default title")) return "Options / variants";

  // Tags / lists
  if (m.includes("tag") || m.includes("material") || m.includes("categor") || m.includes("image url")) return "Tags / lists";

  // Images
  if (m.includes("image")) return "Images";

  // Weight / shipping
  if (m.includes("weight") || m.includes("shipping") || m.includes("fulfillment")) return "Weight / shipping";

  // Whitespace / generic trim
  if (m.includes("whitespace") || m.includes("trimmed")) return "Whitespace cleanup";

  // Generated / filled / mapped
  if (m.includes("generated") || m.includes("filled") || m.includes("mapped")) return "Generated / derived values";

  // Cleaned lists
  if (m.includes("cleaned") || m.includes("normalized list") || m.includes("normalised list")) return "List cleanup";

  // Fallback
  return "Other normalisation";
}

/**
 * Group an array of fixesApplied strings by action type and return sorted groups
 * (highest count first, then alphabetical).
 */
export function groupFixesByType(fixes: string[]): FixGroup[] {
  if (!fixes?.length) return [];

  const map = new Map<string, { count: number; sample: string }>();

  for (const msg of fixes) {
    const type = classifyFix(msg);
    const existing = map.get(type);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(type, { count: 1, sample: msg });
    }
  }

  return Array.from(map.entries())
    .map(([type, { count, sample }]) => ({ type, count, sample }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}

/**
 * Generate a plain-text fix log suitable for downloading as a .txt file.
 */
export function generateFixesLogText(
  fixes: string[],
  opts: { fileName?: string; formatId?: string } = {}
): string {
  const groups = groupFixesByType(fixes);
  const now = new Date().toISOString();

  const lines: string[] = [
    "=== Auto Fix Log ===",
    `Date:     ${now}`,
    `File:     ${opts.fileName ?? "unknown"}`,
    `Format:   ${opts.formatId ?? "unknown"}`,
    `Actions:  ${fixes.length}`,
    "",
    "--- Summary by type ---",
    ...groups.map((g) => `  ${g.count.toString().padStart(4)}×  ${g.type}`),
    "",
    "--- Full action list ---",
    ...fixes.map((x, i) => `${(i + 1).toString().padStart(5)}.  ${x}`),
    "",
  ];

  return lines.join("\n");
}
