const { test, expect } = require("@playwright/test");

test("app shell, manifest and service worker register under GitHub Pages subpath", async ({ page, baseURL }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(baseURL);
  await expect(page).toHaveTitle(/یک استکان شعر/);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "./manifest.webmanifest");
  await expect(page.locator("#pwaStatus")).not.toBeEmpty();
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 15000 });
  const sw = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.ready;
    return { scope: r.scope, active: !!r.active };
  });
  expect(sw.active).toBeTruthy();
  expect(sw.scope).toContain("/-yek-estekan-sher/");
  expect(errors).toEqual([]);
});

test("reader, favorite persistence and image studio work at this viewport", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#entries .verse").first()).toBeVisible();
  await page.locator("#entries .verse").first().click();
  await expect(page.locator("#readerView")).toBeVisible();
  await page.locator("#readerFavorite").click();
  await expect(page.locator("#readerFavorite")).toContainText("نشان‌شده");
  await page.reload();
  await expect(page.locator("#readerView")).toBeVisible();
  await expect(page.locator("#readerFavorite")).toContainText("نشان‌شده");
  await page.locator("#readerMakeImage").click();
  await expect(page.locator("#imageStudioView")).toBeVisible();
  const canvas = await page.locator("#poetryCanvas").evaluate(el => [el.width, el.height]);
  expect(canvas).toEqual([1080, 1350]);
});

test("cached app shell opens again while offline", async ({ page, context, baseURL }) => {
  await page.goto(baseURL);
  await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 15000 });
  await page.evaluate(() => new Promise(resolve => {
    const sw = navigator.serviceWorker.controller;
    if (!sw) return resolve();
    const timer = setTimeout(resolve, 500);
    sw.postMessage({ type: "PING" });
    setTimeout(() => { clearTimeout(timer); resolve(); }, 700);
  }));
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator(".site-header")).toBeVisible();
  await context.setOffline(false);
});
