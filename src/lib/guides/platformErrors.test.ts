import { describe, expect, it } from "vitest";
import { PLATFORM_ERRORS } from "./platformErrors";
import { ISSUE_META_REGISTRY } from "@/lib/validation/issueMetaRegistry";

describe("platform error messages", () => {
  it("belong to rules that exist and that the fixer checks", () => {
    const rules = Object.values(ISSUE_META_REGISTRY).reduce((acc, m) => ({ ...acc, ...m }), {} as Record<string, { checked?: boolean }>);
    for (const code of Object.keys(PLATFORM_ERRORS)) {
      expect(rules[code], code).toBeTruthy();
      expect(rules[code].checked, code).not.toBe(false);
    }
  });
});
