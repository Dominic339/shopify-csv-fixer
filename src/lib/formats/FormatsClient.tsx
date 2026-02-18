"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ALLOW_CUSTOM_FORMATS_FOR_ALL } from "@/lib/featureFlags";
import type { RuleType, UserFormatColumn, UserFormatRule, UserFormatV1 } from "@/lib/formats/customUser";
import { USER_FORMATS_STORAGE_KEY } from "@/lib/formats/customUser";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadFormats(): UserFormatV1[] {
  try {
    const raw = localStorage.getItem(USER_FORMATS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean);
  } catch {
    return [];
  }
}

function saveFormats(formats: UserFormatV1[]) {
  localStorage.setItem(USER_FORMATS_STORAGE_KEY, JSON.stringify(formats));
  // Notify Fixer tab instantly (same-tab event)
  window.dispatchEvent(new Event("csnest-formats-changed"));
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
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function colLabel(i: number) {
  return `Column ${i + 1}`;
}

function headerLabelForColumn(c: UserFormatColumn, idx: number) {
  const t = (c.title ?? "").trim();
  const k = (c.key ?? "").trim();
  return t || k || colLabel(idx);
}

const RULES: { type: RuleType; label: string; needsValue?: boolean; valueLabel?: string }[] = [
  { type: "trim", label: "Trim" },
  { type: "uppercase", label: "Uppercase" },
  { type: "no_spaces", label: "No spaces" },
  { type: "no_special_chars", label: "No special characters", needsValue: true, valueLabel: "Allowed characters (optional)" },
  { type: "numeric_only", label: "Numeric only" },
  { type: "max_length", label: "Max length", needsValue: true, valueLabel: "Max" },
  { type: "required", label: "Required" },
  { type: "default_value", label: "Default value", needsValue: true, valueLabel: "Default" },
  { type: "allowed_values", label: "Allowed values", needsValue: true, valueLabel: "Comma list" },
  { type: "regex_allow", label: "Regex allow", needsValue: true, valueLabel: "Pattern" },
  { type: "regex_block", label: "Regex block", needsValue: true, valueLabel: "Pattern" },
];

export default function FormatsClient() {
  const [sub, setSub] = useState<SubStatus | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const [formats, setFormats] = useState<UserFormatV1[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string>("");

  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/subscription/status", { cache: "no-store" });
        const j = (await r.json()) as SubStatus;
        if (!cancelled) setSub(j);
      } catch {
        if (!cancelled) setSub(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isAdvanced = useMemo(() => {
    return !!sub?.signedIn && sub.plan === "advanced" && sub.status === "active";
  }, [sub]);

  const canAccessCustomFormats = ALLOW_CUSTOM_FORMATS_FOR_ALL || isAdvanced;

  useEffect(() => {
    const initial = loadFormats();
    setFormats(initial);
    setSelectedId(initial[0]?.id ?? null);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const selected = useMemo(() => formats.find((f) => f.id === selectedId) ?? null, [formats, selectedId]);

  function setAndPersist(next: UserFormatV1[]) {
    setFormats(next);
    saveFormats(next);
  }

  function updateSelected(patch: Partial<UserFormatV1>) {
    if (!selected) return;
    const next = formats.map((f) => (f.id === selected.id ? { ...f, ...patch, updatedAt: Date.now() } : f));
    setAndPersist(next);
  }

  function createNewFormat() {
    const now = Date.now();
    const f: UserFormatV1 = {
      version: 1,
      id: `custom_${now}`,
      name: "New format",
      source: "user",
      columns: [],
      rules: [],
      globalRules: [],
      createdAt: now,
      updatedAt: now,
    };
    const next = [f, ...formats];
    setAndPersist(next);
    setSelectedId(f.id);
    setToast("Created new format");
  }

  function deleteSelected() {
    if (!selected) return;
    const next = formats.filter((f) => f.id !== selected.id);
    setAndPersist(next);
    setSelectedId(next[0]?.id ?? null);
    setToast("Deleted format");
  }

  function addColumn() {
    if (!selected) return;
    // IMPORTANT UX:
    // Default the header name to "Column N" so users can immediately edit it.
    // Leaving it blank was confusing because the UI still *shows* Column N via fallback,
    // but the input looked empty.
    const defaultTitle = `Column ${selected.columns.length + 1}`;
    const col: UserFormatColumn = {
      id: uid(),
      key: "",
      title: defaultTitle,
      required: false,
      defaultValue: "",
    };
    updateSelected({ columns: [...selected.columns, col] });
    setToast("Added column");
  }

  function updateColumn(idx: number, patch: Partial<UserFormatColumn>) {
    if (!selected) return;
    const cols = [...selected.columns];
    cols[idx] = { ...cols[idx], ...patch };
    updateSelected({ columns: cols });
  }

  function removeColumn(idx: number) {
    if (!selected) return;
    const cols = selected.columns.filter((_, i) => i !== idx);

    // Remove column scoped rules that referenced the removed columnId
    const removedId = selected.columns[idx]?.id;
    const rules = (selected.rules ?? []).filter((r) => r.columnId !== removedId);

    updateSelected({ columns: cols, rules });
    setToast("Removed column");
  }

  function toggleGlobalRule(type: RuleType, enabled: boolean) {
    if (!selected) return;
    const existing = (selected.globalRules ?? []).filter((r) => r.type === type);
    if (enabled && existing.length) return;
    if (!enabled && !existing.length) return;

    const nextRules = enabled
      ? [...(selected.globalRules ?? []), { scope: "global", type } as UserFormatRule]
      : (selected.globalRules ?? []).filter((r) => r.type !== type);

    updateSelected({ globalRules: nextRules });
  }

  function setGlobalRuleValue(type: RuleType, value: any) {
    if (!selected) return;
    const nextRules = (selected.globalRules ?? []).map((r) => (r.type === type ? { ...r, value } : r));
    updateSelected({ globalRules: nextRules });
  }

  function toggleColumnRule(columnId: string, type: RuleType, enabled: boolean) {
    if (!selected) return;
    const all = selected.rules ?? [];
    const exists = all.some((r) => r.scope === "column" && r.columnId === columnId && r.type === type);

    if (enabled && exists) return;
    if (!enabled && !exists) return;

    const next =
      enabled
        ? [...all, { scope: "column", columnId, type } as UserFormatRule]
        : all.filter((r) => !(r.scope === "column" && r.columnId === columnId && r.type === type));

    updateSelected({ rules: next });
  }

  function setColumnRuleValue(columnId: string, type: RuleType, value: any) {
    if (!selected) return;
    const all = selected.rules ?? [];
    const next = all.map((r) => {
      if (r.scope === "column" && r.columnId === columnId && r.type === type) return { ...r, value };
      return r;
    });
    updateSelected({ rules: next });
  }

  function getGlobalRule(type: RuleType) {
    return (selected?.globalRules ?? []).find((r) => r.type === type) ?? null;
  }

  function getColumnRule(columnId: string, type: RuleType) {
    return (selected?.rules ?? []).find((r) => r.scope === "column" && r.columnId === columnId && r.type === type) ?? null;
  }

  function exportSelected() {
    if (!selected) return;
    const base = selected.name ? safeNamePart(selected.name) : selected.id;
    downloadJson(`${base}.csnest-format.json`, selected);
    setToast("Exported format file");
  }

  async function onImportFile(file: File) {
    try {
      const text = await file.text();
      const obj = JSON.parse(text);

      if (!obj || typeof obj !== "object") throw new Error("Invalid format file");
      if (obj.version !== 1) throw new Error("Unsupported format version");

      const now = Date.now();
      const imported: UserFormatV1 = {
        version: 1,
        id: typeof obj.id === "string" ? obj.id : `custom_${now}`,
        name: typeof obj.name === "string" ? obj.name : "Imported format",
        source: "user",
        columns: Array.isArray(obj.columns) ? obj.columns : [],
        rules: Array.isArray(obj.rules) ? obj.rules : [],
        globalRules: Array.isArray(obj.globalRules) ? obj.globalRules : [],
        createdAt: typeof obj.createdAt === "number" ? obj.createdAt : now,
        updatedAt: now,
      };

      const next = [imported, ...formats];
      setAndPersist(next);
      setSelectedId(imported.id);
      setToast("Imported format");
    } catch (e: any) {
      setToast(e?.message ?? "Import failed");
    }
  }

  // Preview grid headers
  const previewHeaders = useMemo(() => {
    if (!selected) return [];
    return selected.columns.map((c, i) => headerLabelForColumn(c, i));
  }, [selected]);

  const headerNameProblems = useMemo(() => {
    if (!selected) return { duplicates: [] as string[] };
    const names = selected.columns.map((c, i) => headerLabelForColumn(c, i).trim());
    const norm = names.map((n) => n.toLowerCase());
    const counts = new Map<string, number>();
    for (const n of norm) counts.set(n, (counts.get(n) ?? 0) + 1);
    const dups = [...counts.entries()]
      .filter(([k, v]) => k && v > 1)
      .map(([k]) => k)
      .slice(0, 12);
    return { duplicates: dups };
  }, [selected]);

  // Preview rows (fake sample showing rule effects)
  const previewRows = useMemo(() => {
    if (!selected) return [];
    const cols = selected.columns;

    const sampleRaw = cols.map((_, i) => (i === 0 ? "  Example value  " : i === 1 ? "ab c-12" : "Test123"));
    const applyOne = (value: string, rules: UserFormatRule[]) => {
      let v = value;

      const doTrim = rules.some((r) => r.type === "trim");
      if (doTrim) v = v.trim();

      if (rules.some((r) => r.type === "uppercase")) v = v.toUpperCase();
      if (rules.some((r) => r.type === "no_spaces")) v = v.replace(/\s+/g, "");

      const ns = rules.find((r) => r.type === "no_special_chars");
      if (ns) {
        const allowed = String(ns.value ?? "").trim();
        const re = new RegExp(`[^a-zA-Z0-9${allowed.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}]`, "g");
        v = v.replace(re, "");
      }

      if (rules.some((r) => r.type === "numeric_only")) v = v.replace(/[^\d]/g, "");

      const ml = rules.find((r) => r.type === "max_length");
      if (ml) {
        const n = Number(ml.value ?? 0);
        if (Number.isFinite(n) && n > 0 && v.length > n) v = v.slice(0, n);
      }

      const dv = rules.find((r) => r.type === "default_value");
      if (dv && !v) v = String(dv.value ?? "");

      return v;
    };

    const global = selected.globalRules ?? [];

    const row1: Record<string, string> = {};
    const row2: Record<string, string> = {};

    cols.forEach((c, i) => {
      const header = previewHeaders[i];
      const colRules = (selected.rules ?? []).filter((r) => r.scope === "column" && r.columnId === c.id);
      const allRules = [...global, ...colRules];

      row1[header] = sampleRaw[i] ?? "";
      row2[header] = applyOne(sampleRaw[i] ?? "", allRules);
    });

    return [row1, row2];
  }, [selected, previewHeaders]);

  if (!canAccessCustomFormats) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-3xl font-semibold text-[var(--text)]">Custom Formats</h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">
          Custom Formats are available on the Advanced plan. Upgrade to create and manage reusable CSV formats for any workflow.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" className="rgb-btn" onClick={() => setUpgradeOpen(true)}>
            <span className="px-6 py-3 text-sm font-semibold text-[var(--text)]">Upgrade to Advanced</span>
          </button>

          <Link href="/" className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--text)]">
            Back to Home
          </Link>
        </div>

        <UpgradeModal
          open={upgradeOpen}
          title="Advanced only"
          message="Custom Formats are available on the Advanced plan. Upgrade to create and manage reusable CSV formats."
          onClose={() => setUpgradeOpen(false)}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--text)]">Custom Formats</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
            Define expected columns, apply cleanup rules, validate data, and reuse the same format across files.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/app" className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--text)]">
            CSV Fixer
          </Link>

          {selected ? (
            <Link
              href={`/app?preset=${encodeURIComponent(selected.id)}&exportName=${encodeURIComponent(selected.name ?? selected.id)}`}
              className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--text)]"
              title="Open the CSV Fixer with this format selected"
            >
              Open this format
            </Link>
          ) : null}
        </div>
      </div>

      {toast ? (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)]">
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
          if (e.target) e.target.value = "";
        }}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* LEFT */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-sm font-semibold text-[var(--text)]">Your formats</div>
          <p className="mt-2 text-sm text-[var(--muted)]">Saved formats appear here.</p>

          <div className="mt-4 space-y-2">
            {formats.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--muted)]">
                No formats yet. Create one to get started.
              </div>
            ) : (
              formats.map((f) => {
                const active = f.id === selectedId;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedId(f.id)}
                    className={
                      "w-full rounded-2xl border px-4 py-3 text-left text-sm " +
                      (active ? "border-transparent bg-[var(--surface-2)] text-[var(--text)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)]")
                    }
                  >
                    <div className="font-semibold">{f.name}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">{f.columns?.length ?? 0} columns</div>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button type="button" className="rgb-btn" onClick={createNewFormat}>
              <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">New format</span>
            </button>

            <button type="button" className="rgb-btn" onClick={() => importInputRef.current?.click()}>
              <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Import format file</span>
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs text-[var(--muted)]">
            Formats are saved locally on your device. Export a format file to back up or share it.
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-2 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">Format Builder</div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Add columns, configure rules, and preview the final CSV layout.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text)]"
                onClick={addColumn}
                disabled={!selected}
              >
                Add column
              </button>

              <button
                type="button"
                className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text)]"
                onClick={exportSelected}
                disabled={!selected}
              >
                Export format
              </button>

              <button
                type="button"
                className="rgb-btn border border-red-500/60 bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-red-300 disabled:opacity-50"
                onClick={deleteSelected}
                disabled={!selected}
              >
                Delete
              </button>
            </div>
          </div>

          {!selected ? (
            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-sm text-[var(--muted)]">
              Select a format or create a new one to begin editing.
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {/* NAME */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <div className="text-sm font-semibold text-[var(--text)]">Format name</div>
                <input
                  className="mt-3 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] outline-none"
                  value={selected.name}
                  onChange={(e) => updateSelected({ name: e.target.value })}
                  placeholder="Format name"
                />
                <div className="mt-2 text-xs text-[var(--muted)]">ID: {selected.id}</div>
              </div>

              {/* GLOBAL RULES */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <div className="text-sm font-semibold text-[var(--text)]">Format rules (apply to all columns)</div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {RULES.filter((r) => ["trim", "uppercase", "no_spaces", "no_special_chars", "numeric_only", "max_length"].includes(r.type)).map((r) => {
                    const existing = getGlobalRule(r.type);
                    const enabled = !!existing;

                    return (
                      <div key={r.type} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <label className="flex items-center gap-2 text-sm text-[var(--text)]">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => toggleGlobalRule(r.type, e.target.checked)}
                          />
                          {r.label}
                        </label>

                        {r.needsValue && enabled ? (
                          <div className="mt-3">
                            <div className="text-xs text-[var(--muted)]">{r.valueLabel}</div>
                            <input
                              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none"
                              value={String(existing?.value ?? "")}
                              onChange={(e) => setGlobalRuleValue(r.type, e.target.value)}
                              placeholder={r.type === "max_length" ? "10" : ""}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PREVIEW */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <div className="text-sm font-semibold text-[var(--text)]">Preview</div>
                <div className="mt-2 text-xs text-[var(--muted)]">
                  Row 1 is sample input. Row 2 shows the output after applying your current rules.
                </div>

                {headerNameProblems.duplicates.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text)]">
                    <div className="font-semibold">Duplicate header names detected</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      Duplicate headers can overwrite data on export. Rename one of the duplicates.
                    </div>
                    <div className="mt-2 text-xs text-[var(--muted)]">
                      Duplicates: {headerNameProblems.duplicates.join(", ")}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                  <table className="min-w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        {previewHeaders.map((h, i) => (
                          <th key={i} className="px-3 py-2 font-semibold text-[var(--text)] whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r, idx) => (
                        <tr key={idx} className={idx === 0 ? "border-b border-[var(--border)]" : ""}>
                          {previewHeaders.map((h, i) => (
                            <td key={i} className="px-3 py-2 text-[var(--text)] whitespace-nowrap">
                              {(r as any)[h] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* COLUMNS */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <div className="text-sm font-semibold text-[var(--text)]">Columns</div>
                <div className="mt-2 text-xs text-[var(--muted)]">
                  Header name becomes the actual CSV column header your file exports with. If you leave it blank,
                  we’ll fall back to Key or a default (Column 1, Column 2, …).
                </div>

                <div className="mt-4 space-y-3">
                  {selected.columns.length === 0 ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
                      No columns yet. Click Add column to begin.
                    </div>
                  ) : null}

                  {selected.columns.map((c, idx) => {
                    const label = headerLabelForColumn(c, idx);

                    return (
                      <div key={c.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-[var(--text)]">{label}</div>
                            <div className="mt-1 text-xs text-[var(--muted)]">Internal ID: {c.id}</div>
                          </div>

                          <button
                            type="button"
                            className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text)]"
                            onClick={() => removeColumn(idx)}
                          >
                            Remove
                          </button>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div>
                            <div className="text-xs text-[var(--muted)]">Key (optional)</div>
                            <input
                              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none"
                              value={c.key ?? ""}
                              onChange={(e) => updateColumn(idx, { key: e.target.value })}
                              placeholder=""
                            />
                          </div>

                          <div>
                            <div className="text-xs text-[var(--muted)]">Header name (optional)</div>
                            <input
                              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none"
                              value={c.title ?? ""}
                              onChange={(e) => updateColumn(idx, { title: e.target.value })}
                              placeholder="Example: Title"
                            />
                          </div>

                          <label className="flex items-center gap-2 text-sm text-[var(--text)]">
                            <input
                              type="checkbox"
                              checked={!!c.required}
                              onChange={(e) => updateColumn(idx, { required: e.target.checked })}
                            />
                            Required
                          </label>

                          <div>
                            <div className="text-xs text-[var(--muted)]">Default value</div>
                            <input
                              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none"
                              value={c.defaultValue ?? ""}
                              onChange={(e) => updateColumn(idx, { defaultValue: e.target.value })}
                            />
                          </div>
                        </div>

                        {/* PER COLUMN RULES */}
                        <div className="mt-5">
                          <div className="text-sm font-semibold text-[var(--text)]">Column rules</div>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {RULES.map((r) => {
                              const existing = getColumnRule(c.id, r.type);
                              const enabled = !!existing;

                              return (
                                <div key={r.type} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                                  <label className="flex items-center gap-2 text-sm text-[var(--text)]">
                                    <input
                                      type="checkbox"
                                      checked={enabled}
                                      onChange={(e) => toggleColumnRule(c.id, r.type, e.target.checked)}
                                    />
                                    {r.label}
                                  </label>

                                  {r.needsValue && enabled ? (
                                    <div className="mt-3">
                                      <div className="text-xs text-[var(--muted)]">{r.valueLabel}</div>
                                      <input
                                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none"
                                        value={String(existing?.value ?? "")}
                                        onChange={(e) => setColumnRuleValue(c.id, r.type, e.target.value)}
                                        placeholder={r.type === "max_length" ? "10" : ""}
                                      />
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <UpgradeModal
        open={upgradeOpen}
        title="Advanced only"
        message="Custom Formats are available on the Advanced plan. Upgrade to create and manage reusable CSV formats."
        onClose={() => setUpgradeOpen(false)}
      />
    </main>
  );
}
