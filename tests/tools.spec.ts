import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseCsv } from "@/lib/csv";
import { checkBarcode, detectBarcodeColumns, hasValidCheckDigit, repairBarcodes } from "@/lib/tools/barcodes";
import { dedupeRows, suggestKey } from "@/lib/tools/dedupe";
import { fillHandles, handlesForTitles } from "@/lib/tools/handles";
import { repairMojibake, repairTable } from "@/lib/tools/mojibake";
import { detectGroupColumn, splitCsv } from "@/lib/tools/splitCsv";
import { readXlsx, tidyRows } from "@/lib/tools/xlsx";
import { makeZip, readZip } from "@/lib/tools/zip";

const rowsOf = (n: number, handleEvery = 1) =>
  Array.from({ length: n }, (_, i) => ({ Handle: `p${Math.floor(i / handleEvery)}`, SKU: `S${i}` }));

describe("splitCsv", () => {
  it("splits by row count and repeats the header", () => {
    const parts = splitCsv(["Handle", "SKU"], rowsOf(5), { rowsPerFile: 2, groupBy: "" });
    expect(parts.map((p) => p.rows.length)).toEqual([2, 2, 1]);
    for (const p of parts) expect(p.csv.split(/\r?\n/)[0]).toBe('"Handle","SKU"');
  });

  it("never separates the variant rows of one product", () => {
    // 3 rows per product, 2 rows per file: each product goes to its own file.
    const parts = splitCsv(["Handle", "SKU"], rowsOf(9, 3), { rowsPerFile: 4, groupBy: "Handle" });
    for (const p of parts) expect(new Set(p.rows.map((r) => r.Handle)).size).toBe(1);
    expect(parts.length).toBe(3);
  });

  it("keeps WooCommerce variations with the parent row before them", () => {
    const rows = [
      { ID: "1", Parent: "" },
      { ID: "2", Parent: "id:1" },
      { ID: "3", Parent: "id:1" },
      { ID: "4", Parent: "" },
    ];
    const parts = splitCsv(["ID", "Parent"], rows, { rowsPerFile: 2, groupBy: "Parent" });
    expect(parts.map((p) => p.rows.map((r) => r.ID))).toEqual([["1", "2", "3"], ["4"]]);
  });

  it("respects a byte limit", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ A: "x".repeat(100), B: String(i) }));
    const parts = splitCsv(["A", "B"], rows, { rowsPerFile: 1000, maxBytes: 600, groupBy: "" });
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(p.bytes).toBeLessThanOrEqual(600);
    expect(parts.reduce((n, p) => n + p.rows.length, 0)).toBe(20);
  });

  it("detects grouping columns", () => {
    expect(detectGroupColumn(["Title", "Handle"])).toBe("Handle");
    expect(detectGroupColumn(["ID", "Parent", "SKU"])).toBe("Parent");
    expect(detectGroupColumn(["sku", "name"])).toBe("");
  });
});

describe("dedupeRows", () => {
  const rows = [
    { SKU: "A", Name: "One" },
    { SKU: "a ", Name: "One again" },
    { SKU: "B", Name: "Two" },
    { SKU: "", Name: "Blank" },
    { SKU: "", Name: "Blank 2" },
    { SKU: "B", Name: "Two" },
  ];

  it("removes rows that are identical in every column", () => {
    const res = dedupeRows(["SKU", "Name"], rows, { keys: [], keep: "first", loose: false, skipBlankKeys: false });
    expect(res.removedRowNumbers).toEqual([6]);
    expect(res.kept.length).toBe(5);
  });

  it("dedupes on a key column, loosely, keeping the last", () => {
    const res = dedupeRows(["SKU", "Name"], rows, { keys: ["SKU"], keep: "last", loose: true, skipBlankKeys: true });
    expect(res.kept.map((r) => r.Name)).toEqual(["One again", "Blank", "Blank 2", "Two"]);
    expect(res.duplicateGroups).toBe(2);
  });

  it("suggests a key column", () => {
    expect(suggestKey(["Handle", "Variant SKU", "Title"])).toBe("Variant SKU");
  });
});

describe("repairMojibake", () => {
  it("repairs UTF-8 read as Windows-1252", () => {
    expect(repairMojibake("CafÃ©")).toBe("Café");
    expect(repairMojibake("donâ€™t")).toBe("don’t");
    expect(repairMojibake("Ã‰tÃ© â€“ 50 Â°C")).toBe("Été – 50 °C");
    expect(repairMojibake("ZÃ¼rich StraÃŸe")).toBe("Zürich Straße");
  });

  it("repairs text garbled twice", () => {
    expect(repairMojibake("CafÃƒÂ©")).toBe("Café");
  });

  it("leaves correct text alone, including accents next to garbled ones", () => {
    for (const s of ["Café", "NÃO", "São Paulo", "naïve – “quoted”", "100 €", "日本語", ""]) expect(repairMojibake(s)).toBe(s);
    expect(repairMojibake("Café and CafÃ©")).toBe("Café and Café");
  });

  it("reports changed cells", () => {
    const res = repairTable(["TÃ­tulo", "SKU"], [{ "TÃ­tulo": "PiÃ±a", SKU: "A1" }]);
    expect(res.headers).toEqual(["Título", "SKU"]);
    expect(res.rows[0]).toEqual({ "Título": "Piña", SKU: "A1" });
    expect(res.changedCells).toBe(2);
  });
});

describe("barcodes", () => {
  it("validates GS1 check digits", () => {
    expect(hasValidCheckDigit("012345678905")).toBe(true);
    expect(hasValidCheckDigit("4006381333931")).toBe(true);
    expect(hasValidCheckDigit("4006381333932")).toBe(false);
  });

  it("restores a leading zero only when the check digit proves it", () => {
    expect(checkBarcode("12345678905")).toEqual({ value: "012345678905", status: "fixed", reason: "leading-zero" });
    expect(checkBarcode("012345678905")).toEqual({ value: "012345678905", status: "ok" });
    expect(checkBarcode("12345678901").status).toBe("invalid");
  });

  it("expands scientific notation only when no digits were lost", () => {
    expect(checkBarcode("4.006381333931E+12")).toMatchObject({ value: "4006381333931", status: "fixed" });
    expect(checkBarcode("1.2345678905E+10")).toMatchObject({ value: "012345678905", status: "fixed" });
    expect(checkBarcode("4.00638E+12").status).toBe("lost");
  });

  it("handles .0 suffixes, spaces and non-GTIN values", () => {
    expect(checkBarcode("4006381333931.0")).toMatchObject({ value: "4006381333931", status: "fixed" });
    expect(checkBarcode("4 006381 333931")).toMatchObject({ value: "4006381333931", status: "fixed" });
    expect(checkBarcode("B07XJ8C8F5").status).toBe("ok");
    expect(checkBarcode("0306406152").status).toBe("ok"); // ISBN-10
    expect(checkBarcode("").status).toBe("empty");
  });

  it("detects barcode columns and repairs a table", () => {
    expect(detectBarcodeColumns(["Handle", "Variant Barcode", "UPC", "ean_code", "Title"])).toEqual(["Variant Barcode", "UPC", "ean_code"]);
    const res = repairBarcodes([{ UPC: "12345678905" }, { UPC: "1.23457E+11" }, { UPC: "" }], ["UPC"]);
    expect(res.rows.map((r) => r.UPC)).toEqual(["012345678905", "1.23457E+11", ""]);
    expect(res.counts).toMatchObject({ fixed: 1, lost: 1, empty: 1 });
  });
});

describe("handles", () => {
  it("makes unique Shopify handles", () => {
    expect(handlesForTitles(["Linen Shirt!", "Linen shirt", "Café Crème", "", "Rock & Roll Tee"], { unique: true })).toEqual([
      "linen-shirt",
      "linen-shirt-1",
      "cafe-creme",
      "",
      "rock-and-roll-tee",
    ]);
  });

  it("fills a Shopify file, giving variant rows their product's handle", () => {
    const rows = [
      { Title: "Linen Shirt", Handle: "" },
      { Title: "", Handle: "" },
      { Title: "Mug", Handle: "my-mug" },
      { Title: "", Handle: "my-mug" },
      { Title: "Linen Shirt", Handle: "" },
    ];
    const res = fillHandles(["Title", "Handle"], rows, { titleColumn: "Title", handleColumn: "Handle", overwrite: false });
    expect(res.rows.map((r) => r.Handle)).toEqual(["linen-shirt", "linen-shirt", "my-mug", "my-mug", "linen-shirt-1"]);
    expect(res.filled).toBe(3);
  });

  it("adds a handle column when the file has none", () => {
    const res = fillHandles(["Title"], [{ Title: "A b" }], { titleColumn: "Title", handleColumn: "Handle", overwrite: false });
    expect(res.headers).toEqual(["Handle", "Title"]);
  });
});

describe("zip", () => {
  it("round-trips stored files", async () => {
    const enc = new TextEncoder();
    const zip = makeZip([
      { name: "a.csv", data: enc.encode("x,y\n1,2\n") },
      { name: "b.csv", data: enc.encode("é") },
    ]);
    const files = await readZip(zip);
    expect(new TextDecoder().decode(files.get("a.csv"))).toBe("x,y\n1,2\n");
    expect(new TextDecoder().decode(files.get("b.csv"))).toBe("é");
  });
});

describe("readXlsx", () => {
  it("reads a real workbook the way the cells look", async () => {
    const sheets = await readXlsx(new Uint8Array(readFileSync(resolve("tests/fixtures/sample.xlsx"))));
    expect(sheets.map((s) => s.name)).toEqual(["Products", "Second"]);
    const rows = tidyRows(sheets[0].rows);
    expect(rows[0]).toEqual(["Handle", "Title", "Variant Barcode", "Variant Price", "Published At", "Notes"]);
    expect(rows[1]).toEqual(["linen-shirt", "Linen Shirt", "12345678905", "45.5", "2026-03-14", "Café & “quotes”"]);
    expect(rows[2]).toEqual(["linen-shirt", "", "012345678905", "0.3", "2026-03-14 09:30:00", "line1\nline2"]);
    expect(rows[3]).toEqual(["mug", "Ceramic Mug", "4006381333931", "18", "", "TRUE"]);
    // Stored as 1.234567890123457E+18: written out with Excel's 15 significant digits.
    expect(rows[4][3]).toBe("1234567890123460000");
    expect(rows[4][4]).toBe("2026-01-02");
    expect(tidyRows(sheets[1].rows)).toEqual([["", ""], ["", "only cell"]]);
  });

  it("rejects files that are not workbooks", async () => {
    await expect(readXlsx(new TextEncoder().encode("Handle,Title\n"))).rejects.toThrow();
  });
});

describe("tools on parsed CSV", () => {
  it("split output parses back to the same rows", () => {
    const src = parseCsv('Handle,Title\na,"Say ""hi"""\nb,"x,y"\n');
    const [part] = splitCsv(src.headers, src.rows, { rowsPerFile: 10, groupBy: "Handle" });
    expect(parseCsv(part.csv).rows).toEqual(src.rows);
  });
});
