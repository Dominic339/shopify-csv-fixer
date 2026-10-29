// scripts/capture-screens.mjs
// Captures the product screenshots used on the home page and the How it works page,
// in light and dark, from a running copy of the site.
//
//   npm run build && npx next start -p 3100
//   node scripts/capture-screens.mjs [http://localhost:3100]
//   (CHROMIUM_PATH=/path/to/chrome to use an existing browser)
//
// Writes PNGs to public/screens/. Images named *-marked.png carry the numbered
// markers that the How it works text refers to.

import { chromium } from "playwright";
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { resolve } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = resolve("public/screens");
const DEMO = resolve("public/samples/demo-products.csv");
mkdirSync(OUT, { recursive: true });

/** Numbered markers, placed next to elements; removed again with clearMarks(). */
async function mark(page, items) {
  await page.evaluate((items) => {
    for (const { selector, text, n, dx = -14, dy = -14 } of items) {
      // The last match is the deepest one (descendants follow their ancestors).
      const el = text
        ? [...document.querySelectorAll(selector)].filter((e) => e.textContent?.includes(text)).pop()
        : document.querySelector(selector);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const m = document.createElement("div");
      m.className = "sf-shot-mark";
      m.textContent = String(n);
      Object.assign(m.style, {
        position: "absolute",
        left: `${r.left + window.scrollX + dx}px`,
        top: `${r.top + window.scrollY + dy}px`,
        width: "28px",
        height: "28px",
        borderRadius: "999px",
        background: "#4f46e5",
        color: "#fff",
        font: "700 14px/28px Inter, system-ui, sans-serif",
        textAlign: "center",
        boxShadow: "0 0 0 3px rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.25)",
        zIndex: "60",
      });
      document.body.appendChild(m);
    }
  }, items);
}

const clearMarks = (page) => page.evaluate(() => document.querySelectorAll(".sf-shot-mark").forEach((m) => m.remove()));

/** Screenshot of an element, optionally cropped to maxHeight. */
async function shot(page, locator, name, { maxHeight, pad = 0 } = {}) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error(`no box for ${name}`);
  const scrollY = await page.evaluate(() => window.scrollY);
  const clip = {
    x: Math.max(0, box.x - pad),
    y: Math.max(0, box.y + scrollY - pad),
    width: box.width + pad * 2,
    height: Math.min(box.height + pad * 2, maxHeight ?? Infinity),
  };
  await page.screenshot({ path: `${OUT}/${name}.png`, clip, fullPage: true });
}

const section = (page, heading) => page.locator("section", { has: page.getByRole("heading", { name: heading }) }).first();

async function captureTheme(browser, theme) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem("theme_v2", t);
    } catch {}
  }, theme);
  const page = await ctx.newPage();
  const sfx = theme === "dark" ? "-dark" : "";
  const hideChrome = () => page.addStyleTag({ content: "header, footer { display: none !important; }" });

  // ── Fixer ──
  await page.goto(`${BASE}/app?preset=shopify_products`, { waitUntil: "networkidle" });
  await page.setInputFiles("input[type=file]", DEMO);
  await page.getByRole("heading", { name: "Issues" }).waitFor();
  await hideChrome();
  await page.waitForTimeout(800);

  const formatCard = section(page, "Choose the format");
  const setup = formatCard.locator("xpath=..");
  const review = section(page, "Review and export");
  const issues = section(page, "Issues");

  await shot(page, setup, `step-setup${sfx}`);
  await mark(page, [
    { selector: "button", text: "Shopify Import Optimizer", n: 1 },
    { selector: "section", text: "Upload your CSV", n: 2, dx: 24, dy: 70 },
  ]);
  await shot(page, setup, `step-setup-marked${sfx}`, { pad: 16 });
  await clearMarks(page);

  await shot(page, review, `step-review${sfx}`);
  await mark(page, [
    { selector: "[role=status]", n: 1 },
    { selector: "div", text: "Validation score", n: 2, dx: -30, dy: -50 },
    { selector: "button", text: "Export anyway", n: 3 },
  ]);
  await shot(page, review, `step-review-marked${sfx}`, { pad: 16 });
  await clearMarks(page);

  await shot(page, issues, `step-issues${sfx}`, { maxHeight: 760 });
  await mark(page, [
    { selector: "button", text: "Errors", n: 1, dx: -6, dy: -18 },
    { selector: "td.cell-error, [class*='rgba(255,80,80']", n: 2 },
    { selector: "div", text: "Manual fixes", n: 3, dx: -40, dy: -4 },
  ]);
  await shot(page, issues, `step-issues-marked${sfx}`, { maxHeight: 800, pad: 16 });
  await clearMarks(page);

  // Expand "automatic fixes applied" for the export step.
  await review.locator("summary", { hasText: "automatic fixes applied" }).click();
  await page.waitForTimeout(300);
  await shot(page, review, `step-export${sfx}`, { maxHeight: 900 });

  // Hero: review card plus the top of the issues table.
  await review.locator("summary", { hasText: "automatic fixes applied" }).click();
  await page.waitForTimeout(300);
  const top = await review.boundingBox();
  const iss = await issues.boundingBox();
  const scrollY = await page.evaluate(() => window.scrollY);
  await page.screenshot({
    path: `${OUT}/hero${sfx}.png`,
    fullPage: true,
    clip: { x: top.x - 24, y: top.y + scrollY - 24, width: top.width + 48, height: Math.min(iss.y + 520, iss.y + iss.height) - top.y + 24 },
  });

  // ── Converter ──
  await page.goto(`${BASE}/convert`, { waitUntil: "networkidle" });
  await page.selectOption("select >> nth=0", "woocommerce_products");
  await page.selectOption("select >> nth=1", "shopify_products");
  await page.setInputFiles("input[type=file]", resolve("tests/fixtures/woocommerce-export.csv"));
  await hideChrome();
  const result = section(page, "Review and download");
  await result.waitFor();
  await page.waitForTimeout(500);
  await shot(page, result, `convert${sfx}`, { maxHeight: 900 });

  await ctx.close();
}

// Set CHROMIUM_PATH to use an already-installed browser instead of Playwright's download.
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const theme of ["light", "dark"]) await captureTheme(browser, theme);
await browser.close();

// 2x captures → 1600px-wide WebP: sharp on retina screens, small enough for the home page.
// Sizes go to src/lib/screens.json so <Screenshot> can reserve the right space.
const manifest = {};
for (const f of readdirSync(OUT).filter((x) => x.endsWith(".png"))) {
  const info = await sharp(`${OUT}/${f}`).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(`${OUT}/${f.replace(/\.png$/, ".webp")}`);
  unlinkSync(`${OUT}/${f}`);
  manifest[f.replace(/\.png$/, "")] = { width: info.width, height: info.height };
}
writeFileSync(resolve("src/lib/screens.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`screens written to ${OUT}`);
