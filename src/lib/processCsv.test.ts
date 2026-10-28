// Unit tests for the shared CSV processing path used by the Web Worker.
import { describe, it, expect } from "vitest";
import { parseCsv } from "@/lib/csv";
import { getAllFormats } from "@/lib/formats";
import { applyFormatToParsedCsv } from "@/lib/formats/engine";
import { userFormatToCsvFormat, type UserFormatV1 } from "@/lib/formats/customUser";
import { processCsvText, resolveFormat } from "@/lib/processCsv";
import { getStrictMode } from "@/lib/validation/strictMode";

const CSV = [
  "Handle,Title,Variant Price,Published",
  "red-shirt,Red Shirt,19.99,TRUE",
  "red-shirt,,abc,maybe",
  'blue-mug,"Blue, Mug",,FALSE',
].join("\n");

const userSpec: UserFormatV1 = {
  version: 1,
  id: "user_test",
  name: "Test format",
  source: "user",
  columns: [
    { id: "c1", key: "Handle", title: "SKU", required: true },
    { id: "c2", key: "Title", title: "Name" },
  ],
  rules: [],
  globalRules: [{ scope: "global", type: "trim" }],
  createdAt: 0,
  updatedAt: 0,
};

describe("processCsvText", () => {
  it("matches parsing + applying the format directly, for every builtin", () => {
    for (const format of getAllFormats()) {
      const parsed = parseCsv(CSV);
      const direct = applyFormatToParsedCsv(parsed.headers, parsed.rows, format);
      const viaRef = processCsvText(CSV, resolveFormat({ kind: "builtin", id: format.id })!, { strictShopify: false });

      expect(viaRef).toEqual({ ...direct, parseErrors: parsed.parseErrors, parseIssues: parsed.parseIssues });
    }
  });

  it("rebuilds user formats from their stored spec", () => {
    const parsed = parseCsv(CSV);
    const direct = applyFormatToParsedCsv(parsed.headers, parsed.rows, userFormatToCsvFormat(userSpec));
    const viaRef = processCsvText(CSV, resolveFormat({ kind: "user", spec: userSpec })!, { strictShopify: false });

    expect(viaRef.fixedHeaders).toEqual(["SKU", "Name"]);
    expect(viaRef).toEqual({ ...direct, parseErrors: parsed.parseErrors, parseIssues: parsed.parseIssues });
  });

  it("applies the strict-mode preference only for the duration of the call", () => {
    const shopify = resolveFormat({ kind: "builtin", id: "shopify_products" })!;
    const loose = processCsvText(CSV, shopify, { strictShopify: false });
    const strict = processCsvText(CSV, shopify, { strictShopify: true });

    expect(strict.issues.length).toBeGreaterThanOrEqual(loose.issues.length);
    expect(getStrictMode()).toBe(false);
  });

  it("returns structured-cloneable results (required to cross the worker boundary)", () => {
    const shopify = resolveFormat({ kind: "builtin", id: "shopify_products" })!;
    const res = processCsvText(CSV, shopify, { strictShopify: true });
    expect(structuredClone(res)).toEqual(res);
  });

  it("returns null for unknown builtin ids instead of guessing", () => {
    expect(resolveFormat({ kind: "builtin", id: "nope" })).toBeNull();
  });
});
