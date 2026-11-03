import { test, expect } from "@playwright/test";

// Each language is served with its own <html lang> (two root layouts: app/(en) and app/[locale]).
// Checked on the raw HTML, before any JavaScript runs.
for (const [path, lang] of [
  ["/", "en"],
  ["/guides", "en"],
  ["/de", "de"],
  ["/ja/app", "ja"],
  ["/zh/guides", "zh"],
] as const) {
  test(`${path} is served with lang="${lang}"`, async ({ request }) => {
    const res = await request.get(path, { headers: { "Accept-Language": "en" } });
    expect(res.status()).toBe(200);
    expect(await res.text()).toMatch(new RegExp(`<html[^>]* lang="${lang}"`));
  });
}

test("unknown URLs get the branded 404 page", async ({ page }) => {
  for (const path of ["/nope", "/de/nope", "/a/b/c"]) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "This page could not be found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open the CSV Fixer" })).toBeVisible();
  }
});

test("pages share the same link-preview image", async ({ request }) => {
  for (const path of ["/", "/de", "/guides/general/validate-csv-before-import"]) {
    const html = await (await request.get(path, { headers: { "Accept-Language": "en" } })).text();
    expect(html).toContain('property="og:image" content="https://striveformats.com/og.png"');
  }
  const img = await request.get("/og.png");
  expect(img.headers()["content-type"]).toBe("image/png");
});
