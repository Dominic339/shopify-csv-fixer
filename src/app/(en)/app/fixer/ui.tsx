// src/app/app/fixer/ui.ts
// Small shared helpers for the fixer components.

export const muted = "text-[color:rgba(var(--muted-rgb),1)]";
// min-w-0: cards sit in grids, and wide tables inside must scroll rather than widen the page.
export const card = "min-w-0 rounded-3xl border border-[var(--border)] bg-[var(--surface)]";

export function platformLabel(formatId: string): string {
  if (formatId.startsWith("woocommerce")) return "WooCommerce";
  if (formatId === "etsy_listings") return "Etsy";
  if (formatId.startsWith("ebay")) return "eBay";
  if (formatId === "amazon_inventory_loader") return "Amazon";
  if (formatId === "shopify_products") return "Shopify";
  return "";
}

export function StepTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-lg font-semibold text-[var(--text)] sm:text-xl">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:rgba(var(--accent-rgb),0.15)] text-sm font-bold text-[var(--accent)]">
        {n}
      </span>
      {children}
    </h2>
  );
}
