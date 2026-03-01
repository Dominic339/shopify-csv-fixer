// vitest.config.ts
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    snapshotFormat: {
      escapeString: false,
      printBasicPrototype: false,
    },
    // Increase timeout for stress tests
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
