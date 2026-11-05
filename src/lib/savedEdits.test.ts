import { beforeEach, describe, expect, it } from "vitest";
import { applySavedEdits, forgetSavedEdits, loadSavedEdits, recordEdit, rowKey } from "./savedEdits";

// The module only needs window.localStorage; a Map stands in for it here.
const mem = new Map<string, string>();
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      clear: () => mem.clear(),
    },
  },
});

beforeEach(() => mem.clear());

describe("saved edits", () => {
  it("keys Shopify variants by handle and options, and other formats by their id column", () => {
    expect(rowKey("shopify_products", { "URL handle": "tee", "Option1 value": "M", SKU: "" })).toBe("URL handle=tee|Option1 value=M|Option2 value=|Option3 value=");
    expect(rowKey("woocommerce_products", { ID: "", SKU: "MUG-01", Name: "Mug" })).toBe("SKU=MUG-01");
    expect(rowKey("meta_catalog", { id: "" })).toBe("");
  });

  it("re-applies an edit to the same product in a new file, wherever its row is", () => {
    const first = [{ SKU: "MUG-01", Name: "Mug", "Regular price": "" }];
    recordEdit("woocommerce_products", rowKey("woocommerce_products", first[0]), { "Regular price": "18.00" });

    const next = [{ SKU: "TOTE-01", Name: "Tote", "Regular price": "9.00" }, { SKU: "MUG-01", Name: "Mug", "Regular price": "" }];
    const keys = next.map((r) => rowKey("woocommerce_products", r));
    const res = applySavedEdits(next, keys, loadSavedEdits("woocommerce_products"));
    expect(res.rows[1]["Regular price"]).toBe("18.00");
    expect(res.rows[0]).toBe(next[0]);
    expect(res).toMatchObject({ cells: 1, matchedRows: 1 });
  });

  it("finds a row even when its key column was the cell that got fixed", () => {
    const loaded = [{ ID: "41", SKU: "", Name: "Mug" }];
    const key = rowKey("woocommerce_products", loaded[0]);
    recordEdit("woocommerce_products", key, { SKU: "MUG-01" });
    const res = applySavedEdits(loaded, [key], loadSavedEdits("woocommerce_products"));
    expect(res.rows[0].SKU).toBe("MUG-01");
  });

  it("doesn't count cells that already have the value, or columns the file doesn't have", () => {
    recordEdit("meta_catalog", "id=1", { brand: "Acme", color: "Blue" });
    const res = applySavedEdits([{ id: "1", brand: "Acme" }], ["id=1"], loadSavedEdits("meta_catalog"));
    expect(res).toMatchObject({ cells: 0, matchedRows: 0 });
  });

  it("keeps formats apart and forgets on request", () => {
    recordEdit("meta_catalog", "id=1", { brand: "Acme" });
    expect(loadSavedEdits("google_merchant_center")).toEqual({});
    forgetSavedEdits("meta_catalog");
    expect(loadSavedEdits("meta_catalog")).toEqual({});
  });
});
