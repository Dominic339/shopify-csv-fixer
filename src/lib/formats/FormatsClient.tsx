"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ALLOW_CUSTOM_FORMATS_FOR_ALL } from "@/lib/featureFlags";
import {
  generateUserFormatId,
  importUserFormatsIntoStorage,
  loadUserFormatsFromStorage,
  saveUserFormatsToStorage,
  suggestFormatFromCsv,
  userFormatToCsvFormat,
  type RuleType,
  type UserFormatColumn,
  type UserFormatRule,
  type UserFormatV1,
} from "@/lib/formats/customUser";
import { parseCsv } from "@/lib/csv";
import type { CsvRow } from "@/lib/formats/types";
import { createClient } from "@/lib/supabase/browser";
import { fmt } from "@/lib/i18n/fmt";
import { localeHref, type Locale } from "@/lib/i18n/locales";
import { useCookieLocale } from "@/lib/i18n/useCookieLocale";
import type { Translations } from "@/lib/i18n/getTranslations";

type T = Translations["formats"];

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
};

type Sample = { name: string; headers: string[]; rows: CsvRow[] };

const PREVIEW_ROWS = 5;

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function downloadJson(filename: string, obj: unknown) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeNamePart(s: string) {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "format"
  );
}

/** Rule types, with the input each one needs. "required" is a column toggle, not listed here. */
const RULE_TYPES: { type: RuleType; value?: "text" | "number" | "list" | "pattern"; global?: boolean }[] = [
  { type: "trim", global: true },
  { type: "uppercase", global: true },
  { type: "lowercase", global: true },
  { type: "no_spaces", global: true },
  { type: "no_special_chars", value: "text", global: true },
  { type: "max_length", value: "number", global: true },
  { type: "number" },
  { type: "numeric_only" },
  { type: "allowed_values", value: "list" },
  { type: "default_value", value: "text" },
  { type: "regex_allow", value: "pattern" },
  { type: "regex_block", value: "pattern" },
];

function ruleLabel(t: T, type: RuleType): string {
  const labels: Partial<Record<RuleType, string>> = {
    trim: t.ruleTrim,
    uppercase: t.ruleUppercase,
    lowercase: t.ruleLowercase,
    no_spaces: t.ruleNoSpaces,
    no_special_chars: t.ruleNoSpecial,
    max_length: t.ruleMaxLength,
    number: t.ruleNumber,
    numeric_only: t.ruleDigits,
    allowed_values: t.ruleAllowed,
    default_value: t.ruleDefault,
    regex_allow: t.ruleRegexAllow,
    regex_block: t.ruleRegexBlock,
    required: t.required,
  };
  return labels[type] ?? type;
}

function valuePlaceholder(t: T, kind: (typeof RULE_TYPES)[number]["value"]) {
  return kind === "number" ? "100" : kind === "list" ? t.valueList : kind === "pattern" ? t.valuePattern : t.valueText;
}

type Props = { formatsByLocale: Record<Locale, T> };

export default function FormatsClient({ formatsByLocale }: Props) {
  const locale = useCookieLocale();
  const t = formatsByLocale[locale];

  const [sub, setSub] = useState<SubStatus | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [formats, setFormats] = useState<UserFormatV1[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [sample, setSample] = useState<Sample | null>(null);
  const [openColumn, setOpenColumn] = useState<string | null>(null);

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const csvIntent = useRef<"create" | "sample">("create");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session?.user) {
          setSub({ signedIn: false, plan: "free", status: "none" });
          return;
        }
        const { data } = await supabase
          .from("user_subscriptions")
          .select("plan,status")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (cancelled) return;
        const activePlan = data?.status === "active" ? data.plan : "free";
        setSub({ signedIn: true, plan: (activePlan ?? "free") as SubStatus["plan"], status: data?.status ?? "none" });
      } catch {
        if (!cancelled) setSub({ signedIn: false, plan: "free", status: "none" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isAdvanced = !!sub?.signedIn && sub.plan === "advanced" && sub.status === "active";
  const canAccessCustomFormats = ALLOW_CUSTOM_FORMATS_FOR_ALL || isAdvanced;

  useEffect(() => {
    const initial = loadUserFormatsFromStorage();
    setFormats(initial);
    setSelectedId(initial[0]?.id ?? null);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 2500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const selected = useMemo(() => formats.find((f) => f.id === selectedId) ?? null, [formats, selectedId]);

  function setAndPersist(next: UserFormatV1[]) {
    setFormats(next);
    saveUserFormatsToStorage(next);
  }

  function updateSelected(patch: Partial<UserFormatV1>) {
    if (!selected) return;
    setAndPersist(formats.map((f) => (f.id === selected.id ? { ...f, ...patch, updatedAt: Date.now() } : f)));
  }

  function addFormat(f: UserFormatV1, message: string) {
    setAndPersist([f, ...formats]);
    setSelectedId(f.id);
    setToast(message);
  }

  function createBlankFormat() {
    const now = Date.now();
    addFormat(
      {
        version: 1,
        id: generateUserFormatId(new Set(formats.map((f) => f.id))),
        name: t.newFormatName,
        source: "user",
        columns: [],
        rules: [],
        globalRules: [{ scope: "global", type: "trim" }],
        createdAt: now,
        updatedAt: now,
      },
      t.toastCreated
    );
    setSample(null);
  }

  async function onCsvFile(file: File) {
    try {
      const parsed = parseCsv(await file.text());
      if (!parsed.headers.length) throw new Error("no headers");
      const next: Sample = { name: file.name, headers: parsed.headers, rows: parsed.rows };
      setSample(next);
      if (csvIntent.current === "create") {
        const name = file.name.replace(/\.(csv|tsv|txt)$/i, "");
        const f = suggestFormatFromCsv(name, parsed.headers, parsed.rows, new Set(formats.map((x) => x.id)));
        addFormat(f, fmt(t.toastFromCsv, { count: f.columns.length }));
      }
    } catch {
      setToast(t.toastCsvFailed);
    }
  }

  function pickCsv(intent: "create" | "sample") {
    csvIntent.current = intent;
    csvInputRef.current?.click();
  }

  function deleteSelected() {
    if (!selected || !window.confirm(fmt(t.confirmDelete, { name: selected.name }))) return;
    const next = formats.filter((f) => f.id !== selected.id);
    setAndPersist(next);
    setSelectedId(next[0]?.id ?? null);
    setToast(t.toastDeleted);
  }

  function duplicateSelected() {
    if (!selected) return;
    const now = Date.now();
    addFormat(
      {
        ...structuredClone(selected),
        id: generateUserFormatId(new Set(formats.map((f) => f.id))),
        name: fmt(t.copyName, { name: selected.name }),
        createdAt: now,
        updatedAt: now,
      },
      t.toastDuplicated
    );
  }

  function addColumn() {
    if (!selected) return;
    const col: UserFormatColumn = { id: uid(), key: "", title: fmt(t.columnN, { n: selected.columns.length + 1 }), required: false, defaultValue: "" };
    updateSelected({ columns: [...selected.columns, col] });
    setOpenColumn(col.id);
  }

  function updateColumn(idx: number, patch: Partial<UserFormatColumn>) {
    if (!selected) return;
    const cols = [...selected.columns];
    cols[idx] = { ...cols[idx], ...patch };
    updateSelected({ columns: cols });
  }

  function moveColumn(idx: number, dir: -1 | 1) {
    if (!selected) return;
    const j = idx + dir;
    if (j < 0 || j >= selected.columns.length) return;
    const cols = [...selected.columns];
    [cols[idx], cols[j]] = [cols[j], cols[idx]];
    updateSelected({ columns: cols });
  }

  function removeColumn(idx: number) {
    if (!selected) return;
    const removedId = selected.columns[idx]?.id;
    updateSelected({
      columns: selected.columns.filter((_, i) => i !== idx),
      rules: (selected.rules ?? []).filter((r) => r.columnId !== removedId),
    });
  }

  function toggleGlobalRule(type: RuleType, enabled: boolean) {
    if (!selected) return;
    const rest = (selected.globalRules ?? []).filter((r) => r.type !== type);
    updateSelected({ globalRules: enabled ? [...rest, { scope: "global", type }] : rest });
  }

  function setGlobalRuleValue(type: RuleType, value: string) {
    if (!selected) return;
    updateSelected({ globalRules: (selected.globalRules ?? []).map((r) => (r.type === type ? { ...r, value } : r)) });
  }

  function columnRules(columnId: string) {
    return (selected?.rules ?? []).filter((r) => r.scope === "column" && r.columnId === columnId);
  }

  function addColumnRule(columnId: string, type: RuleType) {
    if (!selected || columnRules(columnId).some((r) => r.type === type)) return;
    updateSelected({ rules: [...(selected.rules ?? []), { scope: "column", columnId, type } as UserFormatRule] });
  }

  function removeColumnRule(columnId: string, type: RuleType) {
    if (!selected) return;
    updateSelected({ rules: (selected.rules ?? []).filter((r) => !(r.scope === "column" && r.columnId === columnId && r.type === type)) });
  }

  function setColumnRuleValue(columnId: string, type: RuleType, value: string) {
    if (!selected) return;
    updateSelected({
      rules: (selected.rules ?? []).map((r) => (r.scope === "column" && r.columnId === columnId && r.type === type ? { ...r, value } : r)),
    });
  }

  function exportSelected() {
    if (!selected) return;
    downloadJson(`${safeNamePart(selected.name)}.striveformats-format.json`, selected);
    setToast(t.toastExported);
  }

  async function onImportFile(file: File) {
    try {
      const { imported } = importUserFormatsIntoStorage(JSON.parse(await file.text()));
      if (!imported) throw new Error("nothing imported");
      const next = loadUserFormatsFromStorage();
      setFormats(next);
      setSelectedId(next[0]?.id ?? null);
      setToast(fmt(t.toastImported, { count: imported }));
    } catch {
      setToast(t.toastImportFailed);
    }
  }

  const duplicateHeaders = useMemo(() => {
    if (!selected) return [];
    const counts = new Map<string, number>();
    for (const c of selected.columns) {
      const k = (c.title ?? "").trim().toLowerCase();
      if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts].filter(([, n]) => n > 1).map(([k]) => k);
  }, [selected]);

  // Preview: run the real engine on the sample file, so it matches the fixer exactly.
  const preview = useMemo(() => {
    if (!selected || !sample || selected.columns.length === 0) return null;
    const rows = sample.rows.slice(0, PREVIEW_ROWS);
    const result = userFormatToCsvFormat(selected).apply(sample.headers, rows);
    const fullIssues = userFormatToCsvFormat(selected).apply(sample.headers, sample.rows.slice(0, 2000)).issues;
    const flagged = new Set(result.issues.filter((i) => i.rowIndex >= 0).map((i) => `${i.rowIndex}:${i.column}`));
    return { result, flagged, issueCount: fullIssues.length, fileIssues: fullIssues.filter((i) => i.rowIndex < 0) };
  }, [selected, sample]);

  const btn = "rgb-btn border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] disabled:opacity-50";
  const input = "mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--accent)] sm:text-sm";
  const card = "min-w-0 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6";

  if (!canAccessCustomFormats) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-semibold text-[var(--text)]">{t.title}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t.lockedDesc}</p>
        <ul className="mt-6 space-y-3 text-sm text-[var(--text)]">
          {[t.lockedPoint1, t.lockedPoint2, t.lockedPoint3].map((p) => (
            <li key={p} className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              {p}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={() => setUpgradeOpen(true)}>
            {t.upgrade}
          </button>
          <Link href={localeHref(locale, "/app")} className={btn}>
            {t.openFixer}
          </Link>
        </div>
        <UpgradeModal
          open={upgradeOpen}
          title={t.upgradeTitle}
          message={t.lockedDesc}
          signedIn={Boolean(sub?.signedIn)}
          upgradePlan="advanced"
          onClose={() => setUpgradeOpen(false)}
          labelClose={t.close}
          labelViewPricing={t.viewPricing}
          labelGoToAccount={t.goToAccount}
          labelSignInToUpgrade={t.signInToUpgrade}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold text-[var(--text)]">{t.title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">{t.description}</p>
        </div>
        {selected ? (
          <Link
            href={`${localeHref(locale, "/app")}?preset=${encodeURIComponent(selected.id)}&exportName=${encodeURIComponent(selected.name || selected.id)}`}
            className="btn-primary shrink-0 text-center"
          >
            {t.useInFixer}
          </Link>
        ) : null}
      </div>

      {toast ? (
        <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] shadow-lg" role="status">
          {toast}
        </div>
      ) : null}

      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onImportFile(f);
          e.target.value = "";
        }}
      />
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,.tsv,.txt,text/csv"
        className="hidden"
        data-testid="formats-csv-input"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onCsvFile(f);
          e.target.value = "";
        }}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Format list */}
        <aside className={card}>
          <h2 className="text-sm font-semibold text-[var(--text)]">{t.yourFormats}</h2>

          <div className="mt-4 space-y-2">
            {formats.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">{t.noFormats}</p>
            ) : (
              formats.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(f.id);
                    setOpenColumn(null);
                  }}
                  aria-current={f.id === selectedId ? "true" : undefined}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm text-[var(--text)] ${
                    f.id === selectedId ? "border-[var(--accent)] bg-[var(--surface-2)]" : "border-[var(--border)] bg-[var(--surface)]"
                  }`}
                >
                  <div className="truncate font-semibold">{f.name}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{fmt(t.columnCount, { count: f.columns?.length ?? 0 })}</div>
                </button>
              ))
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button type="button" className="btn-primary" onClick={() => pickCsv("create")}>
              {t.fromCsv}
            </button>
            <button type="button" className={btn} onClick={createBlankFormat}>
              {t.newBlank}
            </button>
            <button type="button" className={btn} onClick={() => importInputRef.current?.click()}>
              {t.importFile}
            </button>
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">{t.fromCsvHint}</p>
          <p className="mt-4 rounded-2xl bg-[var(--surface-2)] p-3 text-xs text-[var(--muted)]">{t.storageNote}</p>
        </aside>

        {/* Builder */}
        {!selected ? (
          <section className={`${card} flex flex-col items-start justify-center gap-4`}>
            <h2 className="text-lg font-semibold">{t.emptyTitle}</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
              <li>{t.emptyStep1}</li>
              <li>{t.emptyStep2}</li>
              <li>{t.emptyStep3}</li>
            </ol>
            <button type="button" className="btn-primary" onClick={() => pickCsv("create")}>
              {t.fromCsv}
            </button>
          </section>
        ) : (
          <div className="min-w-0 space-y-6">
            {/* Name + actions */}
            <section className={card}>
              <label className="text-sm font-semibold text-[var(--text)]" htmlFor="format-name">
                {t.formatName}
              </label>
              <input id="format-name" className={input} value={selected.name} onChange={(e) => updateSelected({ name: e.target.value })} />
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className={btn} onClick={exportSelected}>
                  {t.exportFile}
                </button>
                <button type="button" className={btn} onClick={duplicateSelected}>
                  {t.duplicate}
                </button>
                <button type="button" className={`${btn} !text-red-500`} onClick={deleteSelected}>
                  {t.delete}
                </button>
              </div>
            </section>

            {/* Rules for every column */}
            <section className={card}>
              <h2 className="text-sm font-semibold text-[var(--text)]">{t.globalRules}</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">{t.globalRulesHint}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {RULE_TYPES.filter((r) => r.global).map((r) => {
                  const rule = (selected.globalRules ?? []).find((g) => g.type === r.type);
                  return (
                    <div key={r.type} className="flex flex-wrap items-center gap-2">
                      <label
                        className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                          rule ? "border-[var(--accent)] bg-[var(--surface-2)] text-[var(--text)]" : "border-[var(--border)] text-[var(--muted)]"
                        }`}
                      >
                        <input type="checkbox" className="sr-only" checked={!!rule} onChange={(e) => toggleGlobalRule(r.type, e.target.checked)} />
                        {rule ? "✓ " : ""}
                        {ruleLabel(t, r.type)}
                      </label>
                      {rule && r.value ? (
                        <input
                          className="w-36 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-base text-[var(--text)] sm:text-sm"
                          aria-label={ruleLabel(t, r.type)}
                          value={String(rule.value ?? "")}
                          inputMode={r.value === "number" ? "numeric" : undefined}
                          placeholder={valuePlaceholder(t, r.value)}
                          onChange={(e) => setGlobalRuleValue(r.type, e.target.value)}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Preview */}
            <section className={card}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-[var(--text)]">{t.preview}</h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {sample ? fmt(t.previewWith, { file: sample.name, count: Math.min(PREVIEW_ROWS, sample.rows.length) }) : t.previewHint}
                  </p>
                </div>
                <button type="button" className={btn} onClick={() => pickCsv("sample")}>
                  {sample ? t.changeSample : t.loadSample}
                </button>
              </div>

              {preview ? (
                <>
                  <p className={`mt-4 text-sm font-semibold ${preview.issueCount ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
                    {preview.issueCount ? fmt(t.previewIssues, { count: preview.issueCount }) : t.previewClean}
                  </p>
                  {preview.fileIssues.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--muted)]">
                      {preview.fileIssues.map((i) => (
                        <li key={i.column}>{fmt(t.missingInSample, { column: i.column })}</li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 overflow-x-auto rounded-2xl border border-[var(--border)]">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-[var(--surface-2)]">
                        <tr>
                          {preview.result.fixedHeaders.map((h, i) => (
                            <th key={i} className="whitespace-nowrap px-3 py-2 font-semibold text-[var(--text)]">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.result.fixedRows.map((r, ri) => (
                          <tr key={ri} className="border-t border-[var(--border)]">
                            {preview.result.fixedHeaders.map((h, i) => (
                              <td
                                key={i}
                                className={`max-w-[16rem] truncate whitespace-nowrap px-3 py-2 ${
                                  preview.flagged.has(`${ri}:${h}`) ? "bg-red-500/10 text-red-700 dark:text-red-300" : "text-[var(--text)]"
                                }`}
                              >
                                {r[h] ?? ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </section>
            {/* Columns */}
            <section className={card}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text)]">{t.columns}</h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">{t.columnsHint}</p>
                </div>
                <button type="button" className={btn} onClick={addColumn}>
                  {t.addColumn}
                </button>
              </div>

              {duplicateHeaders.length > 0 && (
                <p className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                  {fmt(t.duplicateWarning, { names: duplicateHeaders.join(", ") })}
                </p>
              )}

              <ol className="mt-4 space-y-2">
                {selected.columns.length === 0 && (
                  <li className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">{t.noColumns}</li>
                )}
                {selected.columns.map((c, idx) => {
                  const rules = columnRules(c.id);
                  const open = openColumn === c.id;
                  const name = (c.title ?? "").trim() || fmt(t.columnN, { n: idx + 1 });
                  const available = RULE_TYPES.filter((r) => !rules.some((x) => x.type === r.type));
                  return (
                    <li key={c.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
                      <div className="flex items-center gap-2 p-3">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          aria-expanded={open}
                          onClick={() => setOpenColumn(open ? null : c.id)}
                        >
                          <span className="w-6 shrink-0 text-xs text-[var(--muted)]">{idx + 1}</span>
                          <span className="truncate text-sm font-semibold text-[var(--text)]">{name}</span>
                          {c.required && (
                            <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-300">
                              {t.required}
                            </span>
                          )}
                          {rules.length > 0 && (
                            <span className="hidden shrink-0 text-xs text-[var(--muted)] sm:inline">{fmt(t.ruleCount, { count: rules.length })}</span>
                          )}
                        </button>
                        <div className="flex shrink-0 items-center gap-1">
                          <IconButton label={t.moveUp} disabled={idx === 0} onClick={() => moveColumn(idx, -1)}>↑</IconButton>
                          <IconButton label={t.moveDown} disabled={idx === selected.columns.length - 1} onClick={() => moveColumn(idx, 1)}>↓</IconButton>
                          <IconButton label={t.removeColumn} onClick={() => removeColumn(idx)}>✕</IconButton>
                        </div>
                      </div>

                      {open && (
                        <div className="space-y-4 border-t border-[var(--border)] p-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="text-xs text-[var(--muted)]">
                              {t.headerName}
                              <input className={input} value={c.title ?? ""} onChange={(e) => updateColumn(idx, { title: e.target.value })} />
                            </label>
                            <label className="text-xs text-[var(--muted)]">
                              {t.alsoAccept}
                              <input
                                className={input}
                                value={c.key ?? ""}
                                placeholder={t.alsoAcceptPlaceholder}
                                onChange={(e) => updateColumn(idx, { key: e.target.value })}
                              />
                            </label>
                            <label className="text-xs text-[var(--muted)]">
                              {t.defaultValue}
                              <input className={input} value={c.defaultValue ?? ""} onChange={(e) => updateColumn(idx, { defaultValue: e.target.value })} />
                            </label>
                            <label className="flex items-center gap-2 self-end pb-2 text-sm text-[var(--text)]">
                              <input type="checkbox" checked={!!c.required} onChange={(e) => updateColumn(idx, { required: e.target.checked })} />
                              {t.requiredLabel}
                            </label>
                          </div>

                          <div>
                            <div className="text-xs font-semibold text-[var(--text)]">{t.columnRules}</div>
                            <ul className="mt-2 space-y-2">
                              {rules.map((r) => {
                                const def = RULE_TYPES.find((x) => x.type === r.type);
                                return (
                                  <li key={r.type} className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                                    <span className="text-sm text-[var(--text)]">{ruleLabel(t, r.type)}</span>
                                    {def?.value ? (
                                      <input
                                        className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-base text-[var(--text)] sm:text-sm"
                                        aria-label={ruleLabel(t, r.type)}
                                        value={String(r.value ?? "")}
                                        inputMode={def.value === "number" ? "numeric" : undefined}
                                        placeholder={valuePlaceholder(t, def.value)}
                                        onChange={(e) => setColumnRuleValue(c.id, r.type, e.target.value)}
                                      />
                                    ) : (
                                      <span className="flex-1" />
                                    )}
                                    <IconButton label={t.removeRule} onClick={() => removeColumnRule(c.id, r.type)}>✕</IconButton>
                                  </li>
                                );
                              })}
                            </ul>
                            {available.length > 0 && (
                              <select
                                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--text)] sm:w-auto sm:text-sm"
                                value=""
                                aria-label={t.addRule}
                                onChange={(e) => e.target.value && addColumnRule(c.id, e.target.value as RuleType)}
                              >
                                <option value="">{t.addRule}</option>
                                {available.map((r) => (
                                  <option key={r.type} value={r.type}>
                                    {ruleLabel(t, r.type)}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>

          </div>
        )}
      </div>
    </main>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] disabled:opacity-30"
    >
      {children}
    </button>
  );
}
