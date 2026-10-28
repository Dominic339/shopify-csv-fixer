// src/components/brand/Logo.tsx
// The StriveFormats mark: a spreadsheet tile whose corner cell holds a check.
// Colours come from CSS variables, so it follows the light/dark theme.

/** Shared geometry, also used to render the favicon and social images. */
export const LOGO_PATHS = {
  viewBox: "0 0 32 32",
  tile: { x: 2, y: 2, width: 28, height: 28, rx: 7.5 },
  lines: "M2.5 11.5h27M12 2.5v27M2.5 20.5h12",
  cell: { x: 15.5, y: 14, width: 12, height: 12, rx: 4 },
  check: "M18.4 20.2l2.2 2.2 4.2-4.6",
} as const;

export function LogoMark({ className, title }: { className?: string; title?: string }) {
  const p = LOGO_PATHS;
  return (
    <svg viewBox={p.viewBox} className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <rect {...p.tile} fill="var(--logo-tile)" />
      <path d={p.lines} stroke="var(--logo-lines)" strokeWidth="1.8" fill="none" />
      <rect {...p.cell} fill="var(--logo-cell)" />
      <path d={p.check} fill="none" stroke="var(--logo-check)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Mark plus wordmark, for the header and footer. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="h-7 w-7 md:h-8 md:w-8" />
      <span className="text-[17px] font-bold tracking-tight text-[var(--text)] md:text-lg">StriveFormats</span>
    </span>
  );
}
