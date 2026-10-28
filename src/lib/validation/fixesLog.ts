// src/lib/validation/fixesLog.ts
// Utilities for grouping, summarising, and downloading fixesApplied logs.

export type FixTypeId =
  | "header" | "handle" | "booleans" | "status" | "prices" | "inventory" | "options"
  | "lists" | "images" | "shipping" | "whitespace" | "derived" | "listCleanup" | "other";

/** English labels; the fixer shows translated ones (app.fixType_<id>). */
export const FIX_TYPE_LABELS: Record<FixTypeId, string> = {
  header: "Header normalisation",
  handle: "URL handle",
  booleans: "Boolean fields",
  status: "Status / visibility",
  prices: "Price fields",
  inventory: "Inventory",
  options: "Options / variants",
  lists: "Tags / lists",
  images: "Images",
  shipping: "Weight / shipping",
  whitespace: "Whitespace cleanup",
  derived: "Generated / derived values",
  listCleanup: "List cleanup",
  other: "Other normalisation",
};

export type FixGroup = {
  /** Fix type (see FIX_TYPE_LABELS) */
  type: FixTypeId;
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
function classifyFix(msg: string): FixTypeId {
  const m = msg.toLowerCase();

  // Header / template level
  if (m.includes("shopify:") || m.includes("header name") || m.includes("template")) return "header";
  if (m.includes("canonical") || m.includes("canonicalized")) return "header";
  if (m.includes("enforced")) return "header";

  // Handle / URL
  if (m.includes("url handle") || m.includes("handle")) return "handle";

  // Booleans: Published, Charge tax, Requires shipping, Gift card
  if (
    m.includes("published") ||
    m.includes("charge tax") ||
    m.includes("requires shipping") ||
    m.includes("gift card")
  )
    return "booleans";

  // Status / visibility
  if (m.includes("status") || m.includes("visibility")) return "status";

  // Pricing fields
  if (m.includes("price") || m.includes("cost per item")) return "prices";

  // Inventory
  if (m.includes("inventory") || m.includes("stock") || m.includes("continue selling")) return "inventory";

  // Options / variants
  if (m.includes("option") || m.includes("variant") || m.includes("default title")) return "options";

  // Tags / lists
  if (m.includes("tag") || m.includes("material") || m.includes("categor") || m.includes("image url")) return "lists";

  // Images
  if (m.includes("image")) return "images";

  // Weight / shipping
  if (m.includes("weight") || m.includes("shipping") || m.includes("fulfillment")) return "shipping";

  // Whitespace / generic trim
  if (m.includes("whitespace") || m.includes("trimmed")) return "whitespace";

  // Generated / filled / mapped
  if (m.includes("generated") || m.includes("filled") || m.includes("mapped")) return "derived";

  // Cleaned lists
  if (m.includes("cleaned") || m.includes("normalized list") || m.includes("normalised list")) return "listCleanup";

  // Fallback
  return "other";
}

/**
 * Group an array of fixesApplied strings by action type and return sorted groups
 * (highest count first, then alphabetical).
 */
export function groupFixesByType(fixes: string[]): FixGroup[] {
  if (!fixes?.length) return [];

  const map = new Map<FixTypeId, { count: number; sample: string }>();

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

export type FixLogText = {
  title: string;
  date: string;
  file: string;
  format: string;
  actions: string;
  summary: string;
  fullList: string;
  unknown: string;
  labels: Record<FixTypeId, string>;
  /** Translate one fix line (identity in English). */
  line: (fix: string) => string;
};

const ENGLISH_LOG: FixLogText = {
  title: "Auto Fix Log",
  date: "Date",
  file: "File",
  format: "Format",
  actions: "Actions",
  summary: "Summary by type",
  fullList: "Full action list",
  unknown: "unknown",
  labels: FIX_TYPE_LABELS,
  line: (x) => x,
};

/**
 * Generate a plain-text fix log suitable for downloading as a .txt file.
 */
export function generateFixesLogText(
  fixes: string[],
  opts: { fileName?: string; formatId?: string; text?: FixLogText } = {}
): string {
  const t = opts.text ?? ENGLISH_LOG;
  const groups = groupFixesByType(fixes);
  const now = new Date().toISOString();
  const field = (label: string, value: string | number) => `${(label + ":").padEnd(10)}${value}`;

  const lines: string[] = [
    `=== ${t.title} ===`,
    field(t.date, now),
    field(t.file, opts.fileName ?? t.unknown),
    field(t.format, opts.formatId ?? t.unknown),
    field(t.actions, fixes.length),
    "",
    `--- ${t.summary} ---`,
    ...groups.map((g) => `  ${g.count.toString().padStart(4)}×  ${t.labels[g.type]}`),
    "",
    `--- ${t.fullList} ---`,
    ...fixes.map((x, i) => `${(i + 1).toString().padStart(5)}.  ${t.line(x)}`),
    "",
  ];

  return lines.join("\n");
}
