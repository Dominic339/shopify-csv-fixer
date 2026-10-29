import { describe, expect, it } from "vitest";

import { parseCsvBlock } from "@/components/guides/CsvSheet";

describe("parseCsvBlock", () => {
  it("reads a CSV example", () => {
    expect(parseCsvBlock("Handle,Title,Price\nblue-shirt,Blue T-Shirt,19.99\n")).toEqual([
      ["Handle", "Title", "Price"],
      ["blue-shirt", "Blue T-Shirt", "19.99"],
    ]);
  });

  it("leaves other code alone", () => {
    expect(parseCsvBlock("=SUBSTITUTE(A2,\",\",\"\")\n=TRIM(B2)")).toBeNull();
    expect(parseCsvBlock("Handle,Title")).toBeNull();
    expect(parseCsvBlock("Note: first, second, third\nand then, more, words")).toBeNull();
    expect(parseCsvBlock("a,b\nc")).toBeNull();
    // Quoting and delimiter examples are about the raw text.
    expect(parseCsvBlock('Title,Price\n"Wallet, Brown",29.99')).toBeNull();
    expect(parseCsvBlock("Handle;Title\nblue;Blue")).toBeNull();
  });
});
