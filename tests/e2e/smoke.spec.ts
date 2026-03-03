import path from "path";
import { test, expect } from "@playwright/test";

test("app page loads, accepts CSV upload, shows issues table and Export button", async ({ page }) => {
  // 1. Visit /app with the Shopify preset pre-selected.
  await page.goto("/app?preset=shopify_products");

  // 2. Confirm the page title is visible.
  await expect(page.getByRole("heading", { name: "CSV Fixer" })).toBeVisible();

  // 3. Upload the minimal fixture CSV via the hidden file input.
  const csvPath = path.join(__dirname, "fixtures", "shopify_minimal.csv");
  const fileInput = page.locator('input[type="file"][accept=".csv,text/csv"]');
  await fileInput.setInputFiles(csvPath);

  // 4. Wait for the issues table to appear (the app renders a table after parsing).
  await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });

  // 5. Confirm the Export button exists.
  await expect(page.getByRole("button", { name: /export/i })).toBeVisible();
});

test("guides hub renders with platform links and search input", async ({ page }) => {
  await page.goto("/guides");

  // Page heading
  await expect(page.getByRole("heading", { name: /CSV Import Guides/i })).toBeVisible();

  // Search input (in sidebar)
  await expect(page.locator('input[type="search"]')).toBeVisible();

  // At least one platform link (Shopify)
  await expect(page.getByRole("link", { name: /Shopify/i }).first()).toBeVisible();
});
