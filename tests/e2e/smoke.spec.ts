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

test("simulate import toggle shows PASS/FAIL card and turns off cleanly", async ({ page }) => {
  // Upload the clean Shopify fixture (no blocking issues → should show PASS)
  await page.goto("/app?preset=shopify_products");
  const csvPath = path.join(__dirname, "fixtures", "shopify_minimal.csv");
  await page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles(csvPath);
  await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });

  // 1. Click "Simulate Import" toggle — card should appear with PASS
  await page.getByRole("button", { name: /Simulate Import/i }).click();
  const card = page.locator('[data-testid="simulation-results-card"]');
  await expect(card).toBeVisible({ timeout: 5_000 });
  await expect(card).toContainText("PASS");

  // 2. Toggle OFF via "Turn off simulation" — card should disappear
  await card.getByRole("button", { name: /Turn off simulation/i }).click();
  await expect(card).not.toBeVisible();
});

test("general MDX guide renders TOC on desktop viewport", async ({ page }) => {
  // Use a wide desktop viewport so the TOC sidebar is visible
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/guides/general/csv-basics-for-imports");

  // Page heading
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });

  // TOC nav should exist (data-testid on the MdxGuideToc component)
  const toc = page.locator('[data-testid="guide-toc"]');
  await expect(toc).toBeVisible({ timeout: 5_000 });

  // At least one TOC link should be rendered
  await expect(toc.locator("a").first()).toBeVisible();
});

test("issue guide page renders expanded sections (Fix in Excel, Fix in Google Sheets, Examples)", async ({ page }) => {
  // Visit a well-known Shopify boolean issue guide
  await page.goto("/guides/shopify/invalid-boolean-published");

  // Page heading
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });

  // Fix in Excel section
  await expect(page.getByRole("heading", { name: /Fix in Excel/i })).toBeVisible();

  // Fix in Google Sheets section
  await expect(page.getByRole("heading", { name: /Fix in Google Sheets/i })).toBeVisible();

  // Examples section
  await expect(page.getByRole("heading", { name: /Examples/i })).toBeVisible();

  // Prevent it next time section
  await expect(page.getByRole("heading", { name: /Prevent it next time/i })).toBeVisible();
});
