import { describe, expect, it } from "vitest";
import { suggestFormatFromCsv, userFormatToCsvFormat, type UserFormatV1 } from "./customUser";

function format(partial: Partial<UserFormatV1>): UserFormatV1 {
  return { version: 1, id: "custom_t", name: "T", source: "user", columns: [], rules: [], globalRules: [], createdAt: 0, updatedAt: 0, ...partial };
}

describe("userFormatToCsvFormat", () => {
  it("keeps letters from every script when removing special characters", () => {
    const f = format({
      columns: [{ id: "a", title: "Name" }],
      rules: [{ scope: "column", columnId: "a", type: "no_special_chars", value: " " }],
    });
    const out = userFormatToCsvFormat(f).apply(["Name"], [{ Name: "Crème brûlée! 日本 #1" }]);
    expect(out.fixedRows[0].Name).toBe("Crème brûlée 日本 1");
  });

  it("normalises numbers without changing plain ones, and flags non-numbers", () => {
    const f = format({
      columns: [{ id: "p", title: "Price" }],
      rules: [{ scope: "column", columnId: "p", type: "number" }],
    });
    const out = userFormatToCsvFormat(f).apply(["Price"], [{ Price: "12.50" }, { Price: "1.234,50" }, { Price: "$ 9" }, { Price: "abc" }]);
    expect(out.fixedRows.map((r) => r.Price)).toEqual(["12.50", "1234.5", "9", "abc"]);
    expect(out.issues.filter((i) => i.code === "custom/number").map((i) => i.rowIndex)).toEqual([3]);
  });

  it("reports a required value once even when set on the column and as a rule", () => {
    const f = format({
      columns: [{ id: "s", title: "SKU", required: true }],
      rules: [{ scope: "column", columnId: "s", type: "required" }],
    });
    const out = userFormatToCsvFormat(f).apply(["SKU"], [{ SKU: "" }]);
    expect(out.issues.filter((i) => i.rowIndex === 0)).toHaveLength(1);
  });

  it("flags format columns missing from the file once, and summarises defaults", () => {
    const f = format({ columns: [{ id: "a", title: "Title" }, { id: "b", title: "Status", defaultValue: "active" }] });
    const out = userFormatToCsvFormat(f).apply(["Title"], [{ Title: "A" }, { Title: "B" }]);
    expect(out.issues.filter((i) => i.rowIndex === -1).map((i) => i.column)).toEqual(["Status"]);
    expect(out.fixedRows.map((r) => r.Status)).toEqual(["active", "active"]);
    expect(out.fixesApplied).toEqual(['Filled the default value into 2 empty "Status" cells']);
  });

  it("matches headers case-insensitively and by alias", () => {
    const f = format({ columns: [{ id: "a", title: "Product name", key: "title" }] });
    const out = userFormatToCsvFormat(f).apply(["TITLE"], [{ TITLE: "Mug" }]);
    expect(out.fixedRows[0]).toEqual({ "Product name": "Mug" });
  });
});

describe("suggestFormatFromCsv", () => {
  it("builds columns and rules the sample already follows", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      SKU: `S-${i}`,
      Price: `${i + 1}.00`,
      Status: i % 2 ? "active" : "draft",
      Zip: `0${1000 + i}`,
      Note: i === 0 ? "" : "x",
    }));
    const f = suggestFormatFromCsv("Orders", ["SKU", "Price", "Status", "Zip", "Note"], rows);
    expect(f.columns.map((c) => c.title)).toEqual(["SKU", "Price", "Status", "Zip", "Note"]);
    expect(f.columns.map((c) => c.required)).toEqual([true, true, true, true, false]);
    const ruleFor = (title: string) => f.rules.find((r) => r.columnId === f.columns.find((c) => c.title === title)!.id)?.type;
    expect(ruleFor("Price")).toBe("number");
    expect(ruleFor("Status")).toBe("allowed_values");
    expect(ruleFor("Zip")).toBeUndefined(); // leading zeros: not treated as a number
    expect(f.globalRules).toEqual([{ scope: "global", type: "trim" }]);

    // The suggested format accepts the sample it was built from.
    const out = userFormatToCsvFormat(f).apply(["SKU", "Price", "Status", "Zip", "Note"], rows);
    expect(out.issues).toEqual([]);
  });
});
