import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated reports.
    "coverage/**",
    "test-results/**",
    "playwright-report/**",
  ]),
  {
    rules: {
      // The codebase is clean against these, so any new violation fails CI. Where a rule has to be
      // broken on purpose, disable it on that line with a reason after "--".
      "@typescript-eslint/no-explicit-any": "error",
      "@next/next/no-html-link-for-pages": "error",
      "react/no-unescaped-entities": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/use-memo": "error",
      "prefer-rest-params": "error",
      // A leading underscore marks a parameter or variable that is unused on purpose.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
    },
  },
]);

export default eslintConfig;
