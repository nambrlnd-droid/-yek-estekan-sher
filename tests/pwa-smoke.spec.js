const { test, expect } = require("@playwright/test");

test("app shell, manifest and service worker register under GitHub Pages subpath", async ({ page, baseURL }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(baseURL);
  await expect(page).toHaveTitle(/یک استکان شعر/);
  await expect(page.locator("#siteStats")).toBeVisible();
  const counts = await page.evaluate(() => ({
    poems: window.poemEntries.filter(x => x.section === "poems").length,
    texts: window.poemEntries.filter(x => x.section === "texts").length,
    authors: new Set(window.poemEntries.map(x => (x.author || "").trim()).filter(Boolean)).size,
    topics: new Set(window.poemEntries.flatMap(x => x.tags || []).map(x => String(x).trim()).filter(Boolean)).size
  }));
  expect(await page.locator("#statPoems").innerText()).toBe(new Intl.NumberFormat("fa-IR").format(counts.poems));
  expect(await page.locator("#statTexts").innerText()).toBe(new Intl.NumberFormat("fa-IR").format(counts.texts));
  expect(await page.locator("#statTotal").innerText()).toBe(new Intl.NumberFormat("fa-IR").format(counts.poems + counts.texts));
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

test("reader, favorite persistence and image studio work at this viewport", async ({ page, baseURL }) => {
  await page.goto(baseURL);
  await expect.poll(() => page.locator("#entries .verse").count(), { timeout: 30000 }).toBeGreaterThan(0);
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
  await page.waitForTimeout(500);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator(".site-header")).toBeVisible();
  await context.setOffline(false);
});


test("Ganjoor archive loads a selected category lazily and paginates results", async ({ page, baseURL }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(baseURL);
  await page.waitForFunction(() => window.YESArchive?.manifestData?.total === 56880, null, { timeout: 15000 });
  await page.locator("#category2Filter").selectOption({ label: "حماسی و ملی" });
  await page.waitForFunction(() => window.poemEntries.filter(x => String(x.id).startsWith("ganjoor-")).length >= 200, null, { timeout: 15000 });
  await expect(page.locator("#category3Filter")).toContainText("نبرد و دلاوری");
  await page.locator("#displayCount").selectOption("10");
  await expect(page.locator("#entries .entry")).toHaveCount(10);
  await page.locator("#displayCount").selectOption("50");
  await expect.poll(() => page.locator("#entries .entry").count()).toBeGreaterThan(0);
  await expect.poll(() => page.locator("#entries .entry").count()).toBeLessThanOrEqual(50);
  await page.locator("#refreshEntries").click();
  await expect.poll(() => page.locator("#entries .entry").count()).toBeLessThanOrEqual(50);
  expect(errors).toEqual([]);
});

test("homepage renders only ten random poems and supports 10-50 display sizes", async ({ page, baseURL }) => {
  await page.goto(baseURL);
  await page.waitForFunction(() => window.YESArchive?.manifestData?.total === 56880, null, { timeout: 15000 });
  await expect(page.locator("#displayCount")).toHaveValue("10");
  await expect.poll(() => page.locator("#entries .entry").count(), { timeout: 30000 }).toBe(10);
  await page.locator("#displayCount").selectOption("30");
  await expect.poll(() => page.locator("#entries .entry").count(), { timeout: 30000 }).toBe(30);
  await page.locator("#refreshEntries").click();
  await expect.poll(() => page.locator("#entries .entry").count()).toBe(30);
  await page.locator("#displayCount").selectOption("50");
  await expect.poll(() => page.locator("#entries .entry").count(), { timeout: 30000 }).toBe(50);
  await expect(page.locator("#entries .entry").count()).resolves.toBeLessThanOrEqual(50);
});


test("refresh shows a new non-overlapping sample and remembers the chosen size", async ({ page, baseURL }) => {
  await page.goto(baseURL);
  await page.waitForFunction(() => window.YESArchive?.manifestData?.total === 56880, null, { timeout: 15000 });
  await expect.poll(() => page.locator("#entries .entry").count(), { timeout: 30000 }).toBe(10);
  const first = await page.locator("#entries .entry").evaluateAll(nodes => nodes.map(node => node.dataset.poemId));
  await page.locator("#refreshEntries").click();
  await expect.poll(async () => {
    const next = await page.locator("#entries .entry").evaluateAll(nodes => nodes.map(node => node.dataset.poemId));
    return next.length === 10 && next.every(id => !first.includes(id));
  }, { timeout: 30000 }).toBeTruthy();
  await page.locator("#displayCount").selectOption("20");
  await expect.poll(() => page.locator("#entries .entry").count(), { timeout: 30000 }).toBe(20);
  await page.reload();
  await expect(page.locator("#displayCount")).toHaveValue("20");
  await expect.poll(() => page.locator("#entries .entry").count(), { timeout: 30000 }).toBe(20);
});

test("favorite state is reflected in the personal notebook", async ({ page, baseURL }) => {
  await page.goto(baseURL);
  await expect.poll(() => page.locator("#entries .entry").count(), { timeout: 30000 }).toBeGreaterThan(0);
  const first = page.locator("#entries .entry").first();
  const poemId = await first.getAttribute("data-poem-id");
  await first.locator("button.favorite").click();
  await expect(first.locator("button.favorite")).toContainText("نشان‌شده");
  await page.locator("#openNotebook").click();
  await expect(page.locator("#notebookView")).toBeVisible();
  await expect.poll(() => page.locator("#notebookItems .notebook-row").count()).toBeGreaterThan(0);
  expect(poemId).toBeTruthy();
});
