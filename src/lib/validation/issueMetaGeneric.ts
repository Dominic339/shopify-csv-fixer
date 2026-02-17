// src/lib/validation/issueMetaGeneric.ts
import type { IssueMeta } from "./issueMeta";

export function getGenericMetaForCode(code: string): IssueMeta | null {
  // Codes from buildSimpleFormat:
  // <formatId>/missing_required_column
  // <formatId>/required_blank
  // <formatId>/invalid_email
  // <formatId>/invalid_number

  if (!code || typeof code !== "string") return null;

  const suffix = code.split("/").slice(-1)[0];

  if (suffix === "missing_required_column") {
    return {
      code,
      category: "structure",
      blocking: true,
      autoFixable: false,
      title: "Missing required column",
      explanation: "Your CSV is missing a required header column for this platform’s import template.",
      whyPlatformCares: "Imports fail or drop data when required headers are missing.",
      howToFix: "Add the missing column header to your CSV and re-upload. If you exported from another system, map its fields to this template.",
    };
  }

  if (suffix === "required_blank") {
    return {
      code,
      category: "structure",
      blocking: true,
      autoFixable: false,
      title: "Required field is blank",
      explanation: "A required field is empty in one or more rows.",
      whyPlatformCares: "Platforms reject rows that are missing required values.",
      howToFix: "Fill in the missing value in the highlighted row(s), then export again.",
    };
  }

  if (suffix === "invalid_email") {
    return {
      code,
      category: "structure",
      blocking: false,
      autoFixable: false,
      title: "Invalid email format",
      explanation: "This email doesn’t look like a valid email address.",
      whyPlatformCares: "Email-based imports require valid addresses to match or contact users.",
      howToFix: "Correct typos and ensure the value looks like name@domain.com.",
    };
  }

  if (suffix === "invalid_number") {
    return {
      code,
      category: "pricing",
      blocking: false,
      autoFixable: false,
      title: "Invalid numeric value",
      explanation: "This field is expected to be numeric, but the value can’t be parsed as a number.",
      whyPlatformCares: "Imports may reject rows or store incorrect values when numeric fields are invalid.",
      howToFix: "Remove currency symbols/commas and use plain numbers (e.g., 19.99).",
    };
  }

  return null;
}
