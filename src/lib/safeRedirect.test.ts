import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safeRedirect";

describe("safeRedirectPath", () => {
  it("keeps same-site paths", () => {
    expect(safeRedirectPath("/profile?upgrade=basic")).toBe("/profile?upgrade=basic");
    expect(safeRedirectPath("/de/app")).toBe("/de/app");
  });

  it("rejects other sites and schemes", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "evil", "/\tx", ""]) {
      expect(safeRedirectPath(bad)).toBe("/app");
    }
    expect(safeRedirectPath(null, "/")).toBe("/");
  });
});
