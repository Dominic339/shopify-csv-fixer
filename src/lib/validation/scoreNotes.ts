// src/lib/validation/scoreNotes.ts
import type { CsvIssue } from "@/lib/formats/types";
import { getIssueMeta } from "@/lib/validation/issueMetaRegistry";

export type ScoreNoteKey =
  | "structure"
  | "variant"
  | "pricing"
  | "inventory"
  | "seo"
  | "images"
  | "sku"
  | "attributes"
  | "media"
  | "compliance"
  | "tags"
  | "shipping";

export type ScoreNote = {
  key: ScoreNoteKey;
  label: string;
  score: number;
  note: string;
};

const LABELS: Record<ScoreNoteKey, string> = {
  structure: "Structure",
  variant: "Variants",
  pricing: "Pricing",
  inventory: "Inventory",
  seo: "SEO",
  images: "Images",
  sku: "SKU integrity",
  attributes: "Attributes",
  media: "Media",
  compliance: "Listing compliance",
  tags: "Tags",
  shipping: "Shipping",
};

function keysForFormat(formatId?: string): ScoreNoteKey[] {
  if (formatId === "woocommerce_products" || formatId === "woocommerce_variable_products") {
    return ["structure", "variant", "sku", "attributes", "pricing", "inventory", "media"];
  }
  if (formatId === "etsy_listings") {
    return ["compliance", "tags", "pricing", "variant", "seo", "shipping", "images"];
  }
  // Default (Shopify + anything unknown)
  return ["structure", "variant", "pricing", "inventory", "seo", "images"];
}

function contextualLowScoreHint(formatId: string | undefined, key: ScoreNoteKey): string {
  if (formatId?.startsWith("shopify")) {
    if (key === "variant") return "Variant issues often come from missing option values or duplicate option combinations.";
    if (key === "seo") return "SEO issues usually won't block import, but they can reduce discoverability.";
  }

  if (formatId?.startsWith("woocommerce")) {
    if (key === "variant") return "Variation issues often come from orphaned variations or missing attribute values.";
    if (key === "sku") return "Duplicate or missing SKUs can overwrite products or break updates.";
    if (key === "attributes") return "Attributes define variation combinations; missing data can collapse or misbuild variations.";
    if (key === "media") return "Missing images can pass import but reduces conversion and listing quality.";
  }

  if (formatId === "etsy_listings") {
    if (key === "compliance") return "Compliance issues can cause a full listing rejection.";
    if (key === "tags") return "Etsy tags have hard limits; duplicates and over-limit tags reduce search reach.";
    if (key === "shipping") return "Shipping profile and processing time fields are required for successful publishing.";
    if (key === "seo") return "SEO fields won't always block publishing, but they affect search visibility.";
  }

  return "";
}

export function buildScoreNotes(validation: any, issues: CsvIssue[], formatId?: string): ScoreNote[] {
  const keys = keysForFormat(formatId);

  const counts: Record<string, { blocking: number; errors: number; warnings: number }> = {};
  for (const k of keys) counts[k] = { blocking: 0, errors: 0, warnings: 0 };

  for (const issue of issues) {
    const meta = getIssueMeta(formatId, issue.code);
    const rawCat = String(meta?.category ?? "structure") as ScoreNoteKey;
    const cat: ScoreNoteKey = rawCat in counts ? rawCat : (keys.includes("structure") ? "structure" : keys[0]);

    if (issue.severity === "error") {
      counts[cat].errors += 1;
      if ((meta?.blocking ?? true) === true) counts[cat].blocking += 1;
    } else if (issue.severity === "warning") {
      counts[cat].warnings += 1;
    }
  }

  return keys.map((k) => {
    const s = Number(validation?.categories?.[k] ?? 0);
    const c = counts[k] ?? { blocking: 0, errors: 0, warnings: 0 };

    const parts: string[] = [];
    if (c.blocking) parts.push(`${c.blocking} blocking ${c.blocking === 1 ? "issue" : "issues"}`);
    if (c.errors && !c.blocking) parts.push(`${c.errors} ${c.errors === 1 ? "error" : "errors"}`);
    if (c.warnings) parts.push(`${c.warnings} ${c.warnings === 1 ? "warning" : "warnings"}`);

    let note = parts.length ? parts.join(", ") : "No issues detected";

    // Add a subtle hint for low scores so it reads as intentional.
    if (Number.isFinite(s) && s < 70 && parts.length) {
      const hint = contextualLowScoreHint(formatId, k);
      if (hint) note += ` · ${hint}`;
    }

    return { key: k, label: LABELS[k], score: Number.isFinite(s) ? s : 100, note };
  });
}
