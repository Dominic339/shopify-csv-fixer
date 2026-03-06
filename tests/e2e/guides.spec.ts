import { test, expect } from "@playwright/test";

test("new curated guide renders with TOC, section cards, and internal /app link", async ({ page }) => {
  // Use a wide desktop viewport so the TOC sidebar is visible
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/guides/general/fix-csv-encoding-errors");

  // Page heading must be visible
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });

  // TOC nav should exist on wide desktop viewport
  const toc = page.locator('[data-testid="guide-toc"]');
  await expect(toc).toBeVisible({ timeout: 5_000 });

  // At least one TOC link should be rendered
  const firstTocLink = toc.locator("a").first();
  await expect(firstTocLink).toBeVisible();

  // TOC link should point to an anchor
  const href = await firstTocLink.getAttribute("href");
  expect(href).toMatch(/^#/);

  // At least one section card must exist (rehypeWrapSections wraps h2s in <section>)
  expect(await page.locator("section").count()).toBeGreaterThan(0);

  // There must be an internal link to /app (the "Fix this automatically" section)
  const appLink = page.locator('a[href="/app"]').first();
  await expect(appLink).toBeVisible();
});

test("new Shopify curated guide renders correctly", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/guides/shopify/shopify-csv-import-errors");

  // Page heading visible
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });

  // Section cards present
  expect(await page.locator("section").count()).toBeGreaterThan(0);

  // Internal link to Shopify CSV fixer
  const shopifyLink = page.locator('a[href*="/app"]').first();
  await expect(shopifyLink).toBeVisible();
});

test("breadcrumb nav is visible on new curated guide page", async ({ page }) => {
  await page.goto("/guides/general/csv-import-checklist");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });

  // Breadcrumb nav should exist
  const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(breadcrumb).toBeVisible();

  // Should contain "Guides" link
  await expect(breadcrumb.getByRole("link", { name: "Guides" })).toBeVisible();
});
