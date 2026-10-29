// src/components/ui/Screenshot.tsx
// A product screenshot in a light browser-style frame. Each image exists in a light
// and a dark version (public/screens/<name>.webp and <name>-dark.webp, made by
// scripts/capture-screens.mjs); the one matching the site theme is shown.

import Image from "next/image";
import SCREENS from "@/lib/screens.json";

export type ScreenName = keyof typeof SCREENS;

type Props = {
  name: ScreenName;
  alt: string;
  /** Load eagerly (the first screenshot on a page). */
  priority?: boolean;
  /** Show the browser-style top bar. */
  frame?: boolean;
  className?: string;
  sizes?: string;
};

export function Screenshot({ name, alt, priority, frame = true, className = "", sizes = "(min-width: 1024px) 960px, 100vw" }: Props) {
  const { width, height } = SCREENS[name];
  const common = { width, height, sizes, priority, className: "block h-auto w-full" } as const;
  return (
    <figure className={`overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-12px_rgba(16,24,40,0.18)] ${className}`}>
      {frame && (
        <div className="flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
        </div>
      )}
      <Image src={`/screens/${name}.webp`} alt={alt} {...common} className={`${common.className} dark:hidden`} />
      <Image src={`/screens/${name}-dark.webp`} alt={alt} {...common} className={`${common.className} hidden dark:block`} />
    </figure>
  );
}
