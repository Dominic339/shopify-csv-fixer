// src/lib/formats/customUser.ts
import type { CsvFormat, CsvFixResult, CsvIssue, CsvRow } from "@/lib/formats/types";

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
  id: string; // stable internal id for rules
  key?: string; // optional mapping hint
  title?: string; // export header (optional)
  required?: boolean;
  defaultValue?: string;
};

export type UserFormatRule = {
  scope: "global" | "column";
  columnId?: string; // required if scope="column"
  type: RuleType;
  value?: any;
};

export type UserFormatV1 = {
  version: 1;
  id: string;
  name: string;
  source: "user";
  columns: UserFormatColumn[];
  rules: UserFormatRule[];
  globalRules: UserFormatRule[];
  createdAt: number;
  updatedAt: number;
};

function safeString(v: any) {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

function normalizeHeaderKey(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function columnDisplayTitle(col: UserFormatColumn, index: number) {
  const t = safeString(col.title).trim();
  return t ? t : `Column ${index + 1}`;
}

function columnMatchKeys(col: UserFormatColumn, index: number) {
  const out: string[] = [];
  const t = safeString(col.title).trim();
  const k = safeString(col.key).trim();
  if (t) out.push(t);
  if (k) out.push(k);
  out.push(`Column ${index + 1}`);
  return out.map(normalizeHeaderKey);
}

function applyRuleToValue(value: string, rule: UserFormatRule): { value: string; changed: boolean } {
  const before = value;

  switch (rule.type) {
    case "trim":
      value = value.trim();
      break;

    case "uppercase":
      value = value.toUpperCase();
      break;

    case "no_spaces":
      value = value.replace(/\s+/g, "");
      break;

    case "no_special_chars": {
      const allowed = safeString(rule.value?.allowed ?? rule.value ?? "");
      const esc = allowed.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const re = new RegExp(`[^a-zA-Z0-9${esc}]`, "g");
      value = value.replace(re, "");
      break;
    }

    case "numeric_only":
      value = value.replace(/[^\d]/g, "");
      break;

    case "max_length": {
      const n = Number(rule.value?.n ?? rule.value ?? 0);
      if (Number.isFinite(n) && n > 0 && value.length > n) value = value.slice(0, n);
      break;
    }

    case "default_value": {
      const dv = safeString(rule.value ?? "");
      if (!value) value = dv;
      break;
    }

    // validation-only
    case "allowed_values":
    case "required":
    case "regex_allow":
    case "regex_block":
      break;

    default:
      break;
  }

  return { value, changed: value !== before };
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

export function loadUserFormatsFromStorage(): UserFormatV1[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(USER_FORMATS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as UserFormatV1[];
  } catch {
    return [];
  }
}

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

      const expectedHeaders = (uf.columns ?? []).map((c, idx) => columnDisplayTitle(c, idx));

      const normalizedInputHeaders = headers.map((h) => normalizeHeaderKey(h));
      const inputIndexByNorm = new Map<string, number>();
      normalizedInputHeaders.forEach((h, idx) => inputIndexByNorm.set(h, idx));

      const matchInputHeaderForCol = (col: UserFormatColumn, colIdx: number): string | null => {
        const candidates = columnMatchKeys(col, colIdx);
        for (const c of candidates) {
          const idx = inputIndexByNorm.get(c);
          if (typeof idx === "number") return headers[idx];
        }
        return null;
      };

      const colInputHeader: (string | null)[] = (uf.columns ?? []).map((c, idx) =>
        matchInputHeaderForCol(c, idx)
      );

      const globalRules = (uf.globalRules ?? []).filter((r) => r?.scope === "global");

      const perColRules = new Map<string, UserFormatRule[]>();
      for (const r of uf.rules ?? []) {
        if (r?.scope !== "column" || !r.columnId) continue;
        const list = perColRules.get(r.columnId) ?? [];
        list.push(r);
        perColRules.set(r.columnId, list);
      }

      const fixedRows: CsvRow[] = rows.map((inRow, rowIndex) => {
        const out: CsvRow = {};

        for (let ci = 0; ci < (uf.columns ?? []).length; ci++) {
          const col = uf.columns[ci];
          const outHeader = expectedHeaders[ci];
          const inputHeader = colInputHeader[ci];

          let v = "";
          if (inputHeader && inRow && Object.prototype.hasOwnProperty.call(inRow, inputHeader)) {
            v = safeString((inRow as any)[inputHeader]);
          } else {
            const fallback = expectedHeaders[ci];
            if (inRow && Object.prototype.hasOwnProperty.call(inRow, fallback)) {
              v = safeString((inRow as any)[fallback]);
            }
          }

          // default value from column config
          const dv = safeString(col.defaultValue ?? "");
          if (!v && dv) {
            v = dv;
            fixesApplied.push(`Row ${rowIndex + 1}: Applied default value for ${outHeader}`);
          }

          // global transforms first
          for (const gr of globalRules) {
            const res = applyRuleToValue(v, gr);
            if (res.changed) v = res.value;
          }

          // column transforms + validations
          const rules = perColRules.get(col.id) ?? [];
          for (const r of rules) {
            const res = applyRuleToValue(v, r);
            if (res.changed) v = res.value;
          }

          // required flag and rule validation
          if (col.required && !v) {
            issues.push({ rowIndex, column: outHeader, severity: "error", message: "Required value is missing" });
          }

          for (const r of rules) {
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

      return {
        fixedHeaders: expectedHeaders,
        fixedRows,
        issues,
        fixesApplied,
      };
    },
  };
}
