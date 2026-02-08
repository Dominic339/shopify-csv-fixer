// src/app/formats/FormatsClient.tsx
// (your file, updated to gate create/import/edit/export to Advanced without introducing new storage files)
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { parseCsv } from "@/lib/csv";
import { UpgradeModal } from "@/components/UpgradeModal";
import {
  columnTemplateTitle,
  generateUserFormatId,
  importUserFormatsIntoStorage,
  loadUserFormatsFromStorage,
  saveUserFormatsToStorage,
  type RuleType,
  type UserFormatColumn,
  type UserFormatRule,
  type UserFormatV1,
} from "@/lib/formats/customUser";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
};

function uid() {
  return Math.random().toString(36).slice(2) + "_" + Date.now().toString(36);
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

const GLOBAL_RULES: { type: RuleType; label: string; needsValue?: boolean; valueLabel?: string }[] =
  [
    { type: "trim", label: "Trim" },
    { type: "uppercase", label: "Uppercase" },
    { type: "no_spaces", label: "No spaces" },
    {
      type: "no_special_chars",
      label: "No special characters",
      needsValue: true,
      valueLabel: "Allowed characters (optional)",
    },
    { type: "numeric_only", label: "Numeric only" },
    { type: "max_length", label: "Max length", needsValue: true, valueLabel: "Max" },
  ];

const COLUMN_RULES: { type: RuleType; label: string; needsValue?: boolean; valueLabel?: string }[] =
  [
    ...GLOBAL_RULES,
    { type: "required", label: "Required" },
    { type: "default_value", label: "Default value", needsValue: true, valueLabel: "Default" },
    { type: "allowed_values", label: "Allowed values", needsValue: true, valueLabel: "Comma list" },
    { type: "regex_allow", label: "Regex allow", needsValue: true, valueLabel: "Pattern" },
    { type: "regex_block", label: "Regex block", needsValue: true, valueLabel: "Pattern" },
  ];

function suggestRulesForHeader(header: string): {
  global: UserFormatRule[];
  perColumn: UserFormatRule[];
} {
  const h = header.trim().toLowerCase();
  const per: UserFormatRule[] = [];

  if (h.includes("email")) {
    per.push({ scope: "column", type: "trim" });
    per.push({ scope: "column", type: "no_spaces" });
  }

  if (h.includes("sku") || h.includes("handle")) {
    per.push({ scope: "column", type: "trim" });
    per.push({ scope: "column", type: "uppercase" });
    per.push({ scope: "column", type: "no_spaces" });
    per.push({
      scope: "column",
      type: "no_special_chars",
      value: { allowed: "-_" },
    });
  }

  if (h.includes("phone") || h.includes("zip") || h.endsWith("_id") || h === "id") {
    per.push({ scope: "column", type: "trim" });
    per.push({ scope: "column", type: "numeric_only" });
  }

  return { global: [], perColumn: per };
}

export default function FormatsClient() {
  const [formats, setFormats] = useState<UserFormatV1[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string>("");

  const importJsonRef = useRef<HTMLInputElement | null>(null);
  const importCsvRef = useRef<HTMLInputElement | null>(null);

  const [sub, setSub] = useState<SubStatus | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    const initial = loadUserFormatsFromStorage();
    setFormats(initial);
    setSelectedId(initial[0]?.id ?? null);
  }, []);

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

  const canEdit = isAdvanced;

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const selected = useMemo(
    () => formats.find((f) => f.id === selectedId) ?? null,
    [formats, selectedId]
  );

  function setAndPersist(next: UserFormatV1[]) {
    setFormats(next);
    saveUserFormatsToStorage(next);
  }

  function requireAdvanced() {
    if (canEdit) return true;
    setUpgradeOpen(true);
    return false;
  }

  function updateSelected(patch: Partial<UserFormatV1>) {
    if (!selected) return;
    if (!requireAdvanced()) return;

    const next = formats.map((f) =>
      f.id === selected.id ? { ...f, ...patch, updatedAt: Date.now() } : f
    );
    setAndPersist(next);
  }

  function createNewFormatWithBlankColumns(count: number) {
    if (!requireAdvanced()) return;

    const now = Date.now();
    const existingIds = new Set(formats.map((f) => f.id));
    const id = generateUserFormatId(existingIds);

    const cols: UserFormatColumn[] = Array.from({ length: count }).map((_, i) => ({
      id: uid(),
      key: "",
      title: columnTemplateTitle(i),
      required: false,
      defaultValue: "",
    }));

    const f: UserFormatV1 = {
      version: 1,
      id,
      name: "New format",
      source: "user",
      columns: cols,
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

  function createNewFormat() {
    createNewFormatWithBlankColumns(1);
  }

  function deleteSelected() {
    if (!selected) return;
    if (!requireAdvanced()) return;

    const next = formats.filter((f) => f.id !== selected.id);
    setAndPersist(next);
    setSelectedId(next[0]?.id ?? null);
    setToast("Deleted format");
  }

  function addColumn() {
    if (!selected) return;
    if (!requireAdvanced()) return;

    const nextIndex = selected.columns.length;
    const col: UserFormatColumn = {
      id: uid(),
      key: "",
      title: columnTemplateTitle(nextIndex),
      required: false,
      defaultValue: "",
    };

    updateSelected({ columns: [...selected.columns, col] });
    setToast("Added column");
  }

  function updateColumn(idx: number, patch: Partial<UserFormatColumn>) {
    if (!selected) return;
    if (!requireAdvanced()) return;

    const cols = [...selected.columns];
    cols[idx] = { ...cols[idx], ...patch };
    updateSelected({ columns: cols });
  }

  function removeColumn(idx: number) {
    if (!selected) return;
    if (!requireAdvanced()) return;

    const removedId = selected.columns[idx]?.id;
    const cols = selected.columns.filter((_, i) => i !== idx);
    const rules = (selected.rules ?? []).filter((r) => r.columnId !== removedId);
    updateSelected({ columns: cols, rules });
    setToast("Removed column");
  }

  function getColumnRule(columnId: string, type: RuleType) {
    return (
      (selected?.rules ?? []).find(
        (r) => r.scope === "column" && r.columnId === columnId && r.type === type
      ) ?? null
    );
  }

  function toggleGlobalRule(type: RuleType, enabled: boolean) {
    if (!selected) return;
    if (!requireAdvanced()) return;

    const exists = (selected.globalRules ?? []).some((r) => r.type === type);
    if (enabled && exists) return;
    if (!enabled && !exists) return;

    const nextRules = enabled
      ? [...(selected.globalRules ?? []), { scope: "global", type } as UserFormatRule]
      : (selected.globalRules ?? []).filter((r) => r.type !== type);

    updateSelected({ globalRules: nextRules });
  }

  function setGlobalRuleValue(type: RuleType, value: any) {
    if (!selected) return;
    if (!requireAdvanced()) return;

    const nextRules = (selected.globalRules ?? []).map((r) =>
      r.type === type ? { ...r, value } : r
    );
    updateSelected({ globalRules: nextRules });
  }

  function toggleColumnRule(columnId: string, type: RuleType, enabled: boolean) {
    if (!selected) return;
    if (!requireAdvanced()) return;

    const all = selected.rules ?? [];
    const exists = all.some(
      (r) => r.scope === "column" && r.columnId === columnId && r.type === type
    );
    if (enabled && exists) return;
    if (!enabled && !exists) return;

    const next = enabled
      ? [...all, { scope: "column", columnId, type } as UserFormatRule]
      : all.filter((r) => !(r.scope === "column" && r.columnId === columnId && r.type === type));

    updateSelected({ rules: next });
  }

  function setColumnRuleValue(columnId: string, type: RuleType, value: any) {
    if (!selected) return;
    if (!requireAdvanced()) return;

    const next = (selected.rules ?? []).map((r) => {
      if (r.scope === "column" && r.columnId === columnId && r.type === type) return { ...r, value };
      return r;
    });
    updateSelected({ rules: next });
  }

  function exportSelected() {
    if (!selected) return;
    if (!requireAdvanced()) return;

    const base = selected.name ? safeNamePart(selected.name) : selected.id;
    downloadJson(`${base}.csnest-format.json`, selected);
    setToast("Exported format file");
  }

  function exportAllFormats() {
    if (!requireAdvanced()) return;

    downloadJson("csnest-format-pack.json", loadUserFormatsFromStorage());
    setToast("Exported format pack");
  }

  async function onImportJson(file: File) {
    if (!requireAdvanced()) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);

      const result = importUserFormatsIntoStorage(payload);

      const refreshed = loadUserFormatsFromStorage();
      setFormats(refreshed);
      setSelectedId(refreshed[0]?.id ?? null);

      setToast(`Imported ${result.imported} format${result.imported === 1 ? "" : "s"}`);
    } catch (e: any) {
      setToast(e?.message ?? "Import failed");
    }
  }

  async function onImportCsv(file: File) {
    if (!requireAdvanced()) return;

    try {
      const text = await file.text();
      const parsed = parseCsv(text);

      const headers = (parsed.headers ?? []).filter((h) => h.trim().length > 0);
      if (!headers.length) {
        setToast("CSV has no headers");
        return;
      }

      const now = Date.now();
      const existingIds = new Set(formats.map((f) => f.id));
      const id = generateUserFormatId(existingIds);

      const cols: UserFormatColumn[] = headers.map((h, i) => ({
        id: uid(),
        key: h,
        title: h || columnTemplateTitle(i),
        required: false,
        defaultValue: "",
      }));

      const globalRules: UserFormatRule[] = [{ scope: "global", type: "trim" }];

      const rules: UserFormatRule[] = [];
      cols.forEach((c, i) => {
        const hdr = headers[i] ?? "";
        const sugg = suggestRulesForHeader(hdr);
        for (const r of sugg.perColumn) rules.push({ ...r, columnId: c.id });
      });

      const f: UserFormatV1 = {
        version: 1,
        id,
        name: `From CSV: ${file.name.replace(/\.csv$/i, "")}`,
        source: "user",
        columns: cols,
        rules,
        globalRules,
        createdAt: now,
        updatedAt: now,
      };

      const next = [f, ...formats];
      setAndPersist(next);
      setSelectedId(f.id);

      setToast("Created format from CSV");
    } catch (e: any) {
      setToast(e?.message ?? "CSV import failed");
    }
  }

  const previewHeaders = useMemo(() => {
    if (!selected) return [];
    return selected.columns.map((c, i) => (c.title?.trim() ? c.title.trim() : columnTemplateTitle(i)));
  }, [selected]);

  const previewRows = useMemo(() => {
    if (!selected) return [];
    const cols = selected.columns;

    const sampleRaw = cols.map((_, i) =>
      i === 0 ? "  Example value  " : i === 1 ? "ab c-12" : "Test123"
    );

    const global = selected.globalRules ?? [];

    const applyRules = (value: string, rules: UserFormatRule[]) => {
      let v = value;
      for (const r of rules) {
        if (r.scope !== "global" && r.scope !== "column") continue;

        if (r.type === "trim") v = v.trim();
        if (r.type === "uppercase") v = v.toUpperCase();
        if (r.type === "no_spaces") v = v.replace(/\s+/g, "");
        if (r.type === "no_special_chars") {
          const allowed = String((r as any).value?.allowed ?? (r as any).value ?? "").trim();
          const esc = allowed.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
          const re = new RegExp(`[^a-zA-Z0-9${esc}]`, "g");
          v = v.replace(re, "");
        }
        if (r.type === "numeric_only") v = v.replace(/[^\d]/g, "");
        if (r.type === "max_length") {
          const n = Number((r as any).value ?? 0);
          if (Number.isFinite(n) && n > 0 && v.length > n) v = v.slice(0, n);
        }
        if (r.type === "default_value") {
          const dv = String((r as any).value ?? "");
          if (!v) v = dv;
        }
      }
      return v;
    };

    const rowRaw: Record<string, string> = {};
    const rowOut: Record<string, string> = {};

    cols.forEach((c, i) => {
      const header = previewHeaders[i];
      const colRules = (selected.rules ?? []).filter(
        (r) => r.scope === "column" && r.columnId === c.id
      );
      const allRules = [...global, ...colRules];

      rowRaw[header] = sampleRaw[i] ?? "";
      rowOut[header] = applyRules(sampleRaw[i] ?? "", allRules);
    });

    return [rowRaw, rowOut];
  }, [selected, previewHeaders]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--text)]">Custom Formats</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
            Define expected columns, apply cleanup rules, validate data, and reuse the same format across files.
          </p>
          {!canEdit ? (
            <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
              Advanced plan required to create, import, edit, or export formats.
            </p>
          ) : null}
        </div>

        <Link
          href="/app"
          className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--text)]"
        >
          CSV Fixer
        </Link>
      </div>

      {toast ? (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)]">
          {toast}
        </div>
      ) : null}

      <input
        ref={importJsonRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onImportJson(f);
          if (e.target) e.target.value = "";
        }}
      />

      <input
        ref={importCsvRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onImportCsv(f);
          if (e.target) e.target.value = "";
        }}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
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
                      (active
                        ? "border-transparent bg-[var(--surface-2)] text-[var(--text)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)]")
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
            <button type="button" className={"rgb-btn" + (canEdit ? "" : " opacity-60")} onClick={createNewFormat}>
              <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">New format</span>
            </button>

            <button
              type="button"
              className={"rgb-btn" + (canEdit ? "" : " opacity-60")}
              onClick={() => (canEdit ? importJsonRef.current?.click() : setUpgradeOpen(true))}
            >
              <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Import format file</span>
            </button>

            <button
              type="button"
              className={"rgb-btn" + (canEdit ? "" : " opacity-60")}
              onClick={() => (canEdit ? importCsvRef.current?.click() : setUpgradeOpen(true))}
            >
              <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Import sample CSV</span>
            </button>

            <button type="button" className={"rgb-btn" + (canEdit ? "" : " opacity-60")} onClick={exportAllFormats}>
              <span className="px-4 py-3 text-sm font-semibold text-[var(--text)]">Export all formats</span>
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs text-[var(--muted)]">
            Formats are saved locally on your device. Export a format file or pack to back up or share it.
          </div>
        </div>

        <div className="lg:col-span-2 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">Format Builder</div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Columns start with template names like Column 1. Edit Title to rename.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={"rgb-btn border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text)]" + (canEdit ? "" : " opacity-60")}
                onClick={addColumn}
                disabled={!selected}
              >
                Add column
              </button>

              <button
                type="button"
                className={"rgb-btn border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text)]" + (canEdit ? "" : " opacity-60")}
                onClick={exportSelected}
                disabled={!selected}
              >
                Export format
              </button>

              <button
                type="button"
                className={"rgb-btn border border-red-500/60 bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-red-300 disabled:opacity-50" + (canEdit ? "" : " opacity-60")}
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
            <div className={"mt-6 space-y-6" + (canEdit ? "" : " opacity-75")}>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <div className="text-sm font-semibold text-[var(--text)]">Format name</div>
                <input
                  className="mt-3 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] outline-none"
                  value={selected.name}
                  onChange={(e) => updateSelected({ name: e.target.value })}
                  placeholder="Format name"
                  readOnly={!canEdit}
                />
                <div className="mt-2 text-xs text-[var(--muted)]">ID: {selected.id}</div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <div className="text-sm font-semibold text-[var(--text)]">Format rules (apply to all columns)</div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {GLOBAL_RULES.map((r) => {
                    const existing = (selected.globalRules ?? []).find((x) => x.type === r.type) ?? null;
                    const enabled = !!existing;

                    return (
                      <div key={r.type} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <label className="flex items-center gap-2 text-sm text-[var(--text)]">
                          <input
                            type="checkbox"
                            checked={enabled}
                            disabled={!canEdit}
                            onChange={(e) => toggleGlobalRule(r.type, e.target.checked)}
                          />
                          {r.label}
                        </label>

                        {r.needsValue && enabled ? (
                          <div className="mt-3">
                            <div className="text-xs text-[var(--muted)]">{r.valueLabel}</div>
                            <input
                              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none"
                              value={String((existing as any)?.value ?? "")}
                              disabled={!canEdit}
                              onChange={(e) => setGlobalRuleValue(r.type, e.target.value)}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <div className="text-sm font-semibold text-[var(--text)]">Preview</div>
                <div className="mt-2 text-xs text-[var(--muted)]">
                  Row 1 is sample input. Row 2 shows output after applying your current rules.
                </div>

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

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <div className="text-sm font-semibold text-[var(--text)]">Columns</div>

                <div className="mt-4 space-y-3">
                  {selected.columns.map((c, idx) => (
                    <div key={c.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-[var(--text)]">{columnTemplateTitle(idx)}</div>
                          <div className="mt-1 text-xs text-[var(--muted)]">Internal ID: {c.id}</div>
                        </div>

                        <button
                          type="button"
                          className={"rgb-btn border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text)]" + (canEdit ? "" : " opacity-60")}
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
                            disabled={!canEdit}
                            onChange={(e) => updateColumn(idx, { key: e.target.value })}
                          />
                        </div>

                        <div>
                          <div className="text-xs text-[var(--muted)]">Title</div>
                          <input
                            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none"
                            value={c.title ?? columnTemplateTitle(idx)}
                            disabled={!canEdit}
                            onChange={(e) => updateColumn(idx, { title: e.target.value })}
                          />
                        </div>

                        <label className="flex items-center gap-2 text-sm text-[var(--text)]">
                          <input
                            type="checkbox"
                            checked={!!c.required}
                            disabled={!canEdit}
                            onChange={(e) => updateColumn(idx, { required: e.target.checked })}
                          />
                          Required
                        </label>

                        <div>
                          <div className="text-xs text-[var(--muted)]">Default value</div>
                          <input
                            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none"
                            value={c.defaultValue ?? ""}
                            disabled={!canEdit}
                            onChange={(e) => updateColumn(idx, { defaultValue: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="text-sm font-semibold text-[var(--text)]">Column rules</div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {COLUMN_RULES.map((r) => {
                            const existing = getColumnRule(c.id, r.type);
                            const enabled = !!existing;

                            return (
                              <div key={r.type} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                                <label className="flex items-center gap-2 text-sm text-[var(--text)]">
                                  <input
                                    type="checkbox"
                                    checked={enabled}
                                    disabled={!canEdit}
                                    onChange={(e) => toggleColumnRule(c.id, r.type, e.target.checked)}
                                  />
                                  {r.label}
                                </label>

                                {r.needsValue && enabled ? (
                                  <div className="mt-3">
                                    <div className="text-xs text-[var(--muted)]">{r.valueLabel}</div>
                                    <input
                                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none"
                                      value={String((existing as any)?.value ?? "")}
                                      disabled={!canEdit}
                                      onChange={(e) => setColumnRuleValue(c.id, r.type, e.target.value)}
                                    />
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}

                  {selected.columns.length === 0 ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
                      No columns yet. Click Add column to begin.
                    </div>
                  ) : null}
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
