"use client";

import Link from "next/link";
import { localeHref } from "@/lib/i18n/locales";
import type { AppStrings, Fixer } from "./useFixer";
import { card, muted, StepTitle } from "./ui";

/** Step 1: chips on larger screens, a native select on phones. */
export function FormatPicker({ f, t, presetNames }: { f: Fixer; t: AppStrings; presetNames: Record<string, string> }) {
  return (
    <section className={`${card} p-5 sm:p-7`}>
      <StepTitle n={1}>{t.stepFormat}</StepTitle>

      <label className="mt-4 block sm:hidden">
        <span className="sr-only">{t.selectFormat}</span>
        <select
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-base text-[var(--text)]"
          value={f.formatId}
          onChange={(e) => f.setFormatId(e.target.value)}
        >
          {f.allFormats.map((fmt) => (
            <option key={fmt.id} value={fmt.id}>
              {presetNames[fmt.id] ?? fmt.name}
              {fmt.source === "user" ? ` (${t.customBadge})` : ""}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4 hidden flex-wrap gap-2 sm:flex" role="radiogroup" aria-label={t.selectFormat}>
        {f.allFormats.map((fmt) => {
          const active = fmt.id === f.formatId;
          return (
            <button
              key={fmt.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`pill-btn ${active ? "is-active" : ""}`}
              onClick={() => f.setFormatId(fmt.id)}
            >
              {presetNames[fmt.id] ?? fmt.name}
              {fmt.source === "user" ? <span className={`ml-1 text-xs ${muted}`}>({t.customBadge})</span> : null}
            </button>
          );
        })}
      </div>

      <p className={`mt-4 text-sm ${muted}`}>
        {t.builtInFormats}{" "}
        {f.canAccessCustomFormats ? (
          t.customFormatsHere
        ) : (
          <>
            {t.customFormatsAdvancedOnly}{" "}
            <Link className="underline" href={`${localeHref(f.currentLocale, "/")}#pricing`}>
              {t.upgradeToAdvanced}
            </Link>
          </>
        )}
      </p>
    </section>
  );
}
