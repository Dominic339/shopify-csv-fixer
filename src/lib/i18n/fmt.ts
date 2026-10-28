// src/lib/i18n/fmt.ts
// Client-safe string templating for translations.

/** Fill a "{name}" template, e.g. fmt("Why {platform} rejects this", { platform: "Shopify" }). */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
}

/** Pick the singular or plural template by count, then fill it. */
export function plural(count: number, one: string, many: string, values: Record<string, string | number> = {}): string {
  return fmt(count === 1 ? one : many, { count, ...values });
}
