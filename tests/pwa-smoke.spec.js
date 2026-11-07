const { test, expect } = require("@playwright/test");

async function openPrimary(page, route) {
  const desktop = page.locator(`#v16PrimaryNav a[data-route="${route}"]`);
  if (await desktop.isVisible()) await desktop.click();
  else await page.locator(`#mobileDock button[data-action="${route}"]`).click();
}

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
  await page.goto(baseURL + "#/search");
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
  await page.goto(baseURL + "#/search");
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
  await page.goto(baseURL + "#/search");
  await page.waitForFunction(() => window.YESArchive?.manifestData?.total === 56880, null, { timeout: 15000 });
  await expect(page.locator("#displayCount")).toHaveValue("10");
  await expect.poll(() => page.locator("#entries .entry").count(), { timeout: 30000 }).toBe(10);
  await page.locator("#displayCount").selectOption("30");
  await expect.poll(() => page.locator("#entries .entry").count(), { timeout: 30000 }).toBe(30);
  await page.locator("#refreshEntries").click();
  await expect.poll(() => page.locator("#entries .entry").count(), { timeout: 30000 }).toBe(30);
  await page.locator("#displayCount").selectOption("50");
  await expect.poll(() => page.locator("#entries .entry").count(), { timeout: 30000 }).toBe(50);
  await expect(page.locator("#entries .entry").count()).resolves.toBeLessThanOrEqual(50);
});


test("refresh shows a new non-overlapping sample and remembers the chosen size", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/search");
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
  await page.goto(baseURL + "#/search");
  await expect.poll(() => page.locator("#entries .entry").count(), { timeout: 30000 }).toBeGreaterThan(0);
  const first = page.locator("#entries .entry").first();
  const poemId = await first.getAttribute("data-poem-id");
  await first.locator("button.favorite").click();
  await expect(first.locator("button.favorite")).toContainText("نشان‌شده");
  await openPrimary(page, "notebook");
  await expect(page.locator("#notebookView")).toBeVisible();
  await expect.poll(() => page.locator("#notebookItems .notebook-row").count()).toBeGreaterThan(0);
  expect(poemId).toBeTruthy();
});


test("daily poem, theme toggle and mobile quick navigation are available", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL);
  await expect(page.locator("#dailyPoem")).toBeVisible();
  await expect(page.locator("#themeToggle")).toBeVisible();
  await page.locator("#themeToggle").click();
  await expect(page.locator("body")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("#mobileDock")).toBeVisible();
  await page.locator('#mobileDock button[data-action="search"]').click();
  await expect(page.locator("#search")).toBeFocused();
});


test("random poem opens the reader and the homepage offers continue reading", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/search");
  await expect.poll(() => page.locator("#entries .entry").count(), { timeout: 60000 }).toBeGreaterThan(0);
  await page.locator("#randomPoem").click();
  await expect(page.locator("#readerView")).toBeVisible();
  await page.locator("#readerBack").click();
  await openPrimary(page, "home");
  await expect(page.locator("#continueReading")).toBeVisible();
  await page.locator("#continueReading button").click();
  await expect(page.locator("#readerView")).toBeVisible();
});

test("v1.5 visual stylesheet loads and preserves responsive theme controls", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL);
  const visualCss = await page.evaluate(async () => {
    const link = document.querySelector('link[href*="v15-visual.css"]');
    if (!link) return { linked: false };
    await link.sheet;
    return {
      linked: true,
      loaded: !!link.sheet,
      bodyBackground: getComputedStyle(document.body).backgroundImage,
      cardRadius: getComputedStyle(document.querySelector(".entry") || document.body).borderRadius,
      dockVisible: getComputedStyle(document.querySelector("#mobileDock")).display !== "none"
    };
  });
  expect(visualCss.linked).toBeTruthy();
  expect(visualCss.loaded).toBeTruthy();
  expect(visualCss.dockVisible).toBeTruthy();
  await page.locator("#themeToggle").click();
  await expect(page.locator("body")).toHaveAttribute("data-theme", "light");
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);
});


test("v1.5 library provides topic browsing and lazy archive categories", async ({ page, baseURL }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(baseURL + "#/library");
  await expect(page.locator("#v15LibraryView")).toBeVisible();
  await page.locator("#v15LibraryContent .v15-library-group").nth(2).getByRole("button", { name: /حماسی و ملی/ }).click();
  await expect.poll(() => page.locator("#v15LibraryResults .v15-work").count(), { timeout: 30000 }).toBeGreaterThan(0);
  await page.locator("#v15LibraryResults .v15-work").first().click();
  await expect(page.locator("#readerView")).toBeVisible();
  await page.locator("#readerBack").click();
  await expect(page.locator("#v15LibraryView")).toBeVisible();
  expect(errors).toEqual([]);
});

test("v1.5 poet index opens author work lists", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/library");
  await page.getByRole("button", { name: "شاعران و نویسندگان" }).click();
  await expect.poll(() => page.locator("#v15LibraryContent .v15-library-card").count()).toBeGreaterThan(0);
  await page.locator("#v15LibraryContent .v15-library-card").first().click();
  await expect(page.locator("#v15LibraryTitle")).not.toBeEmpty();
  await expect.poll(() => page.locator("#v15LibraryResults .v15-work").count()).toBeGreaterThan(0);
});

test("v1.5 advanced search supports exact phrase and full-line matching", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/search");
  await expect(page.locator("#v15SearchMode")).toBeVisible();
  const sample = await page.evaluate(() => {
    const item = window.poemEntries.find(x => x.section === "poems" && String(x.body || "").includes("\n"));
    const line = item?.body.split(/\r?\n/).map(x => x.trim()).find(Boolean) || "";
    return { id: item?.id, line };
  });
  expect(sample.id).toBeTruthy();
  expect(sample.line).toBeTruthy();
  await page.locator("#v15SearchMode").selectOption("phrase");
  const phraseMatch = await page.evaluate(({ id, line }) => {
    const item = window.poemEntries.find(x => x.id === id);
    return window.YESSearch.matches(item, line);
  }, sample);
  expect(phraseMatch).toBeTruthy();
  await page.locator("#v15SearchMode").selectOption("line");
  const lineMatch = await page.evaluate(({ id, line }) => {
    const item = window.poemEntries.find(x => x.id === id);
    return window.YESSearch.matches(item, line);
  }, sample);
  expect(lineMatch).toBeTruthy();
  const normalized = await page.evaluate(() => window.YESSearch.normalize("ي ك"));
  expect(normalized).toBe("ی ک");
});

test("v1.5 reader focus mode and related works are available", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/search");
  await expect.poll(() => page.locator("#entries .verse").count(), { timeout: 30000 }).toBeGreaterThan(0);
  await page.locator("#entries .verse").first().click();
  await expect(page.locator("#readerView")).toBeVisible();
  await page.locator(".v15-focus-toggle").click();
  await expect(page.locator("body")).toHaveClass(/reader-focus/);
  await page.locator(".v15-focus-toggle").click();
  await expect(page.locator("body")).not.toHaveClass(/reader-focus/);
  await expect(page.locator("#v15Related")).toBeAttached();
});

test("v1.5 library and advanced controls fit a narrow mobile viewport", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(baseURL + "#/search");
  await expect(page.locator("#v15SearchMode")).toBeVisible();
  await page.locator('#sections button[data-section="texts"]').click();
  await expect(page.locator("#sectionTitle")).toContainText("متون");
  await page.locator('#sections button[data-section="poems"]').click();
  await expect(page.locator("#sectionTitle")).toContainText("اشعار");
  await page.locator('#mobileDock button[data-action="library"]').click();
  await expect(page.locator("#v15LibraryView")).toBeVisible();
  await page.locator('#mobileDock button[data-action="home"]').click();
  await expect(page.locator("#homePageView")).toBeVisible();
  await page.locator('#mobileDock button[data-action="library"]').click();
  await expect(page.locator("#v15LibraryView")).toBeVisible();
  await page.getByRole("button", { name: "پیشنهاد‌ومیض" }).click();
  await expect(page.locator("#pinnedView")).toBeVisible();
  await expect.poll(() => page.locator("#pinnedEntries .pinned-item").count()).toBeGreaterThan(0);
  await page.locator("#backFromPinned").click();
  await expect(page.locator("#v15LibraryView")).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);
});


test("v1.6 primary sections are independent deep-linkable pages", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  await expect(page.locator("#homePageView")).toBeVisible();
  await expect(page.locator("#searchPageView")).toBeHidden();

  await openPrimary(page, "library");
  await expect(page).toHaveURL(/#\/library$/);
  await expect(page.locator("#v15LibraryView")).toBeVisible();
  await expect(page.locator("#homePageView")).toBeHidden();

  await openPrimary(page, "search");
  await expect(page).toHaveURL(/#\/search$/);
  await expect(page.locator("#searchPageView")).toBeVisible();
  await expect(page.locator("#search")).toBeVisible();

  await openPrimary(page, "favorites");
  await expect(page).toHaveURL(/#\/favorites$/);
  await expect(page.locator("#favoritesPageView")).toBeVisible();

  await openPrimary(page, "notebook");
  await expect(page).toHaveURL(/#\/notebook$/);
  await expect(page.locator("#notebookView")).toBeVisible();
});

test("v1.6 direct page links survive reload and mobile navigation changes routes", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL + "#/search");
  await expect(page.locator("#searchPageView")).toBeVisible();
  await page.reload();
  await expect(page.locator("#searchPageView")).toBeVisible();
  await page.locator('#mobileDock button[data-action="favorites"]').click();
  await expect(page).toHaveURL(/#\/favorites$/);
  await expect(page.locator("#favoritesPageView")).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);
});
