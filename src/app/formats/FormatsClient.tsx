"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ALLOW_CUSTOM_FORMATS_FOR_ALL } from "@/lib/featureFlags";

type SubStatus = {
  signedIn: boolean;
  plan: "free" | "basic" | "advanced";
  status: string;
};

type CustomColumn = {
  key: string;
  title: string;
  required?: boolean;
  defaultValue?: string;
};

type CustomFormat = {
  version: 1;
  id: string;
  name: string;
  source: "user";
  columns: CustomColumn[];
  rules: any[];
  globalRules: any[];
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "csnest_user_formats_v1";

function safeIdPart(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function loadFormats(): CustomFormat[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean);
  } catch {
    return [];
  }
}

function saveFormats(formats: CustomFormat[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(formats));
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

export default function FormatsClient() {
  const [sub, setSub] = useState<SubStatus | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const [formats, setFormats] = useState<CustomFormat[]>([]);
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

  const selected = useMemo(() => {
    return formats.find((f) => f.id === selectedId) ?? null;
  }, [formats, selectedId]);

  function updateSelected(patch: Partial<CustomFormat>) {
    if (!selected) return;
    const next = formats.map((f) =>
      f.id === selected.id ? { ...f, ...patch, updatedAt: Date.now() } : f
    );
    setFormats(next);
    saveFormats(next);
  }

  function createNewFormat() {
    const now = Date.now();
    const id = `custom_${now}`;
    const f: CustomFormat = {
      version: 1,
      id,
      name: "New format",
      source: "user",
      columns: [
        { key: "email", title: "Email", required: true, defaultValue: "" },
        { key: "sku", title: "SKU", required: true, defaultValue: "" },
      ],
      rules: [],
      globalRules: [],
      createdAt: now,
      updatedAt: now,
    };

    const next = [f, ...formats];
    setFormats(next);
    setSelectedId(f.id);
    saveFormats(next);
    setToast("Created new format");
  }

  function deleteSelected() {
    if (!selected) return;
    const next = formats.filter((f) => f.id !== selected.id);
    setFormats(next);
    setSelectedId(next[0]?.id ?? null);
    saveFormats(next);
    setToast("Deleted format");
  }

  function addColumn() {
    if (!selected) return;
    const nextCol: CustomColumn = { key: `col_${selected.columns.length + 1}`, title: "New Column", required: false, defaultValue: "" };
    updateSelected({ columns: [...selected.columns, nextCol] });
    setToast("Added column");
  }

  function updateColumn(idx: number, patch: Partial<CustomColumn>) {
    if (!selected) return;
    const cols = [...selected.columns];
    cols[idx] = { ...cols[idx], ...patch };
    updateSelected({ columns: cols });
  }

  function removeColumn(idx: number) {
    if (!selected) return;
    const cols = selected.columns.filter((_, i) => i !== idx);
    updateSelected({ columns: cols });
    setToast("Removed column");
  }

  function exportSelected() {
    if (!selected) return;
    downloadJson(`${selected.name ? safeIdPart(selected.name) : selected.id}.csnest-format.json`, selected);
    setToast("Exported format file");
  }

  async function onImportFile(file: File) {
    try {
      const text = await file.text();
      const obj = JSON.parse(text);

      if (!obj || typeof obj !== "object") throw new Error("Invalid format file");
      if (obj.version !== 1) throw new Error("Unsupported format version");

      const now = Date.now();
      const imported: CustomFormat = {
        version: 1,
        id: obj.id && typeof obj.id === "string" ? obj.id : `custom_${now}`,
        name: obj.name && typeof obj.name === "string" ? obj.name : "Imported format",
        source: "user",
        columns: Array.isArray(obj.columns) ? obj.columns : [],
        rules: Array.isArray(obj.rules) ? obj.rules : [],
        globalRules: Array.isArray(obj.globalRules) ? obj.globalRules : [],
        createdAt: typeof obj.createdAt === "number" ? obj.createdAt : now,
        updatedAt: now,
      };

      const next = [imported, ...formats];
      setFormats(next);
      setSelectedId(imported.id);
      saveFormats(next);
      setToast("Imported format");
    } catch (e: any) {
      setToast(e?.message ?? "Import failed");
    }
  }

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

          <Link
            href="/"
            className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--text)]"
          >
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
          <Link
            href="/app"
            className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--text)]"
          >
            CSV Fixer
          </Link>
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

        <div className="lg:col-span-2 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">Format Builder</div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Edit the format name and columns now. Rules and sample CSV preview come next.
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

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                <div className="text-sm font-semibold text-[var(--text)]">Columns</div>

                <div className="mt-4 space-y-3">
                  {selected.columns.map((c, idx) => (
                    <div key={idx} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="text-xs text-[var(--muted)]">Key</div>
                          <input
                            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none"
                            value={c.key}
                            onChange={(e) => updateColumn(idx, { key: e.target.value })}
                          />
                        </div>

                        <div>
                          <div className="text-xs text-[var(--muted)]">Title</div>
                          <input
                            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none"
                            value={c.title}
                            onChange={(e) => updateColumn(idx, { title: e.target.value })}
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

                      <div className="mt-3">
                        <button
                          type="button"
                          className="rgb-btn border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text)]"
                          onClick={() => removeColumn(idx)}
                        >
                          Remove column
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-xs text-[var(--muted)]">
                  Rules and sample CSV preview will be added next. This step gets saving and format files working now.
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
