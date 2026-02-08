// src/lib/formats/customUser.ts
import type { CsvFormat, CsvFixResult, CsvIssue, CsvRow } from "./types";

export const USER_FORMATS_STORAGE_KEY = "csnest_user_formats_v1";

export type RuleType =
  | "trim"
  | "uppercase"
  | "no_spaces"
  | "no_special_chars"
  | "numeric_only"
  | "max_length"
  | "required"
  | "default_value"
  | "allowed_values"
  | "regex_allow"
  | "regex_block";

export type UserFormatColumn = {
  id: string; // stable internal id for per-column rules
  key?: string; // optional mapping hint (matches CSV header)
  title?: string; // exported header name (shown in Fixer)
  required?: boolean;
  defaultValue?: string;
};

export type UserFormatRule = {
  scope: "global" | "column";
  columnId?: string;
  type: RuleType;
  value?: any;
};

export type UserFormatV1 = {
  version: 1;
  id: string;
  name: string;
  source: "user";
  columns: UserFormatColumn[];
  rules: UserFormatRule[]; // per-column rules
  globalRules: UserFormatRule[]; // apply to all columns
  createdAt: number;
  updatedAt: number;
};

export function columnTemplateTitle(index0: number) {
  return `Column ${index0 + 1}`;
}

function safeString(v: any) {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

function normalizeHeaderKey(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function applyTransform(value: string, rule: UserFormatRule) {
  let v = value;

  switch (rule.type) {
    case "trim":
      v = v.trim();
      break;

    case "uppercase":
      v = v.toUpperCase();
      break;

    case "no_spaces":
      v = v.replace(/\s+/g, "");
      break;

    case "no_special_chars": {
      const allowed = safeString(rule.value?.allowed ?? rule.value ?? "");
      const esc = allowed.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const re = new RegExp(`[^a-zA-Z0-9${esc}]`, "g");
      v = v.replace(re, "");
      break;
    }

    case "numeric_only":
      v = v.replace(/[^\d]/g, "");
      break;

    case "max_length": {
      const n = Number(rule.value?.n ?? rule.value ?? 0);
      if (Number.isFinite(n) && n > 0 && v.length > n) v = v.slice(0, n);
      break;
    }

    case "default_value": {
      const dv = safeString(rule.value ?? "");
      if (!v) v = dv;
      break;
    }

    // validation-only (no transform)
    case "required":
    case "allowed_values":
    case "regex_allow":
    case "regex_block":
      break;

    default:
      break;
  }

  return v;
}

function validateValue(value: string, rule: UserFormatRule): string | null {
  switch (rule.type) {
    case "required":
      return value ? null : "Required value is missing";

    case "allowed_values": {
      const raw = rule.value;
      const list = Array.isArray(raw)
        ? raw.map(safeString)
        : safeString(raw)
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);

      if (!list.length) return null;
      return list.includes(value) ? null : `Value must be one of: ${list.join(", ")}`;
    }

    case "regex_allow": {
      const pattern = safeString(rule.value?.pattern ?? rule.value ?? "");
      if (!pattern) return null;
      try {
        const re = new RegExp(pattern);
        return re.test(value) ? null : "Value does not match required pattern";
      } catch {
        return "Invalid regex allow pattern";
      }
    }

    case "regex_block": {
      const pattern = safeString(rule.value?.pattern ?? rule.value ?? "");
      if (!pattern) return null;
      try {
        const re = new RegExp(pattern);
        return re.test(value) ? "Value matches blocked pattern" : null;
      } catch {
        return "Invalid regex block pattern";
      }
    }

    default:
      return null;
  }
}

/**
 * IMPORTANT:
 * - Always returns an array.
 * - If legacy storage contains a single object, we wrap it.
 */
export function loadUserFormatsFromStorage(): UserFormatV1[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(USER_FORMATS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) return parsed.filter(Boolean) as UserFormatV1[];
    if (parsed && typeof parsed === "object") return [parsed as UserFormatV1];

    return [];
  } catch {
    return [];
  }
}

export function saveUserFormatsToStorage(formats: UserFormatV1[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_FORMATS_STORAGE_KEY, JSON.stringify(formats));
  window.dispatchEvent(new Event("csnest-formats-changed"));
}

export function generateUserFormatId(existing: Set<string>) {
  let id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  while (existing.has(id)) id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return id;
}

export function ensureUniqueFormatId(incomingId: string | undefined, existing: Set<string>) {
  const cleaned = safeString(incomingId).trim();
  if (!cleaned || existing.has(cleaned)) return generateUserFormatId(existing);
  return cleaned;
}

/**
 * Import one file that can contain:
 * - a single format object
 * - OR an array of formats (format pack)
 *
 * IDs are optional. If missing or duplicated, we generate a new one.
 */
export function importUserFormatsIntoStorage(payload: unknown) {
  const current = loadUserFormatsFromStorage();
  const existingIds = new Set(current.map((f) => f.id));

  const normalizeOne = (obj: any): UserFormatV1 | null => {
    if (!obj || typeof obj !== "object") return null;
    const version = Number(obj.version ?? 1);
    if (version !== 1) return null;

    const now = Date.now();
    const id = ensureUniqueFormatId(obj.id, existingIds);
    existingIds.add(id);

    const cols = Array.isArray(obj.columns) ? obj.columns : [];
    const rules = Array.isArray(obj.rules) ? obj.rules : [];
    const globalRules = Array.isArray(obj.globalRules) ? obj.globalRules : [];

    const out: UserFormatV1 = {
      version: 1,
      id,
      name: typeof obj.name === "string" && obj.name.trim() ? obj.name : "Imported format",
      source: "user",
      columns: cols,
      rules,
      globalRules,
      createdAt: typeof obj.createdAt === "number" ? obj.createdAt : now,
      updatedAt: now,
    };

    return out;
  };

  const incoming: UserFormatV1[] = [];

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const n = normalizeOne(item);
      if (n) incoming.push(n);
    }
  } else {
    const n = normalizeOne(payload);
    if (n) incoming.push(n);
  }

  const next = [...incoming, ...current];
  saveUserFormatsToStorage(next);

  return { imported: incoming.length, totalNow: next.length };
}

function displayTitle(col: UserFormatColumn, idx: number) {
  const t = safeString(col.title).trim();
  return t ? t : columnTemplateTitle(idx);
}

function matchKeysForColumn(col: UserFormatColumn, idx: number) {
  const out: string[] = [];
  const title = safeString(col.title).trim();
  const key = safeString(col.key).trim();

  if (title) out.push(title);
  if (key) out.push(key);

  // also allow matching against template name
  out.push(columnTemplateTitle(idx));

  return out.map(normalizeHeaderKey);
}

/**
 * Convert a saved user format into a CsvFormat usable by the Fixer.
 */
export function userFormatToCsvFormat(uf: UserFormatV1): CsvFormat {
  return {
    id: uf.id,
    name: uf.name,
    description: "User format",
    category: "Custom",
    source: "user",
    apply: (headers: string[], rows: CsvRow[]): CsvFixResult => {
      const fixesApplied: string[] = [];
      const issues: CsvIssue[] = [];

      const expectedHeaders = (uf.columns ?? []).map((c, idx) => displayTitle(c, idx));

      const inputNorm = headers.map((h) => normalizeHeaderKey(h));
      const inputIndexByNorm = new Map<string, number>();
      inputNorm.forEach((h, idx) => inputIndexByNorm.set(h, idx));

      const inputHeaderForCol: (string | null)[] = (uf.columns ?? []).map((c, idx) => {
        const candidates = matchKeysForColumn(c, idx);
        for (const cand of candidates) {
          const hit = inputIndexByNorm.get(cand);
          if (typeof hit === "number") return headers[hit];
        }
        return null;
      });

      const globalRules = (uf.globalRules ?? []).filter((r) => r?.scope === "global");

      const rulesByColumnId = new Map<string, UserFormatRule[]>();
      for (const r of uf.rules ?? []) {
        if (r?.scope !== "column" || !r.columnId) continue;
        const list = rulesByColumnId.get(r.columnId) ?? [];
        list.push(r);
        rulesByColumnId.set(r.columnId, list);
      }

      const fixedRows: CsvRow[] = rows.map((inRow, rowIndex) => {
        const out: CsvRow = {};

        for (let ci = 0; ci < (uf.columns ?? []).length; ci++) {
          const col = uf.columns[ci];
          const outHeader = expectedHeaders[ci];
          const inputHeader = inputHeaderForCol[ci];

          // pull value from input row
          let v = "";
          if (inputHeader && inRow && Object.prototype.hasOwnProperty.call(inRow, inputHeader)) {
            v = safeString((inRow as any)[inputHeader]);
          } else {
            // fallback: if input already has same header name
            if (inRow && Object.prototype.hasOwnProperty.call(inRow, outHeader)) {
              v = safeString((inRow as any)[outHeader]);
            }
          }

          // apply default value
          const dv = safeString(col.defaultValue ?? "");
          if (!v && dv) {
            v = dv;
            fixesApplied.push(`Row ${rowIndex + 1}: Applied default value for ${outHeader}`);
          }

          // transforms
          for (const gr of globalRules) v = applyTransform(v, gr);

          const colRules = rulesByColumnId.get(col.id) ?? [];
          for (const r of colRules) v = applyTransform(v, r);

          // validations
          if (col.required && !v) {
            issues.push({
              rowIndex,
              column: outHeader,
              severity: "error",
              message: "Required value is missing",
            });
          }

          for (const r of colRules) {
            const msg = validateValue(v, r);
            if (msg) issues.push({ rowIndex, column: outHeader, severity: "error", message: msg });
          }

          for (const gr of globalRules) {
            const msg = validateValue(v, gr);
            if (msg) issues.push({ rowIndex, column: outHeader, severity: "error", message: msg });
          }

          out[outHeader] = v;
        }

        return out;
      });

      return { fixedHeaders: expectedHeaders, fixedRows, issues, fixesApplied };
    },
  };
}
