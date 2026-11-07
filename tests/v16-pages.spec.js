const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title !== "all archive poems load before the site is revealed") {
    await page.addInitScript(() => { window.__YES_TEST_SKIP_ARCHIVE_GATE = true; });
  }
});

async function openPage(page, route) {
  const desktopLink = page.locator('#v16PrimaryNav a[data-route="' + route + '"]');
  if (await desktopLink.isVisible()) {
    await desktopLink.click();
  } else {
    await page.locator('#mobileDock button[data-action="' + route + '"]').click();
  }
}

test.describe("v1.6 independent page routes", () => {
  test("five primary sections render as separate page views", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator("#homePageView")).toBeVisible();

    await openPage(page, "library");
    await expect(page).toHaveURL(/#\/library$/);
    await expect(page.locator("#v15LibraryView")).toBeVisible();
    await expect(page.locator("#homePageView")).toBeHidden();

    await openPage(page, "search");
    await expect(page).toHaveURL(/#\/search$/);
    await expect(page.locator("#searchPageView")).toBeVisible();
    await expect(page.locator("#regularView")).toBeVisible();
    await expect(page.locator("#v15LibraryView")).toBeHidden();

    await openPage(page, "favorites");
    await expect(page).toHaveURL(/#\/favorites$/);
    await expect(page.locator("#favoritesPageView")).toBeVisible();
    await expect(page.locator("#searchPageView")).toBeHidden();

    await openPage(page, "notebook");
    await expect(page).toHaveURL(/#\/notebook$/);
    await expect(page.locator("#notebookView")).toBeVisible();
    await expect(page.locator("#notebookTabs button").nth(0)).toHaveClass(/active/);
    await expect(page.locator("#favoritesPageView")).toBeHidden();

    await openPage(page, "home");
    await expect(page).toHaveURL(/#\/home$/);
    await expect(page.locator("#homePageView")).toBeVisible();
    await expect(page.locator("#notebookView")).toBeHidden();
  });

  test("each page can be opened directly by its addressable route", async ({ page }) => {
    for (const route of ["home", "library", "search", "favorites", "notebook"]) {
      await page.goto("./#/" + route);
      const target = {
        home: "#homePageView",
        library: "#v15LibraryView",
        search: "#searchPageView",
        favorites: "#favoritesPageView",
        notebook: "#notebookView"
      }[route];
      await expect(page.locator(target)).toBeVisible();
    }
  });

  test("all five primary destinations remain reachable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("./");
    await expect(page.locator("#mobileDock button[data-action]")).toHaveCount(5);
    for (const route of ["home", "library", "search", "favorites", "notebook"]) {
      await openPage(page, route);
      const target = {
        home: "#homePageView",
        library: "#v15LibraryView",
        search: "#searchPageView",
        favorites: "#favoritesPageView",
        notebook: "#notebookView"
      }[route];
      await expect(page.locator(target)).toBeVisible();
    }
  });
});

test("a favorite snapshot remains readable when its archive record is not preloaded", async ({ page }) => {
  await page.goto("./#/favorites");
  await page.evaluate(async () => {
    await window.YESStorage.put("favorites", {
      id: "snapshot-poem-v16",
      contentId: "snapshot-poem-v16",
      itemSnapshot: {
        id: "snapshot-poem-v16",
        title: "آزمون حفظ علاقه‌مندی",
        body: "این متن آزمایشی است و باید از روی نسخهٔ ذخیره‌شده باز شود.",
        author: "آزمون",
        section: "poems",
        tags: []
      },
      createdAt: new Date().toISOString()
    });
  });
  await page.reload();
  await expect(page.locator("#favoritesPageView")).toBeVisible();
  await page.locator(".v16-favorite-open").click();
  await expect(page.locator("#readerView")).toBeVisible();
  await expect(page.locator("#readerBody")).toContainText("این متن آزمایشی است");
});

test("image studio returns to the reader's originating page", async ({ page }) => {
  await page.goto("./#/search");
  await expect.poll(() => page.locator("#entries .verse").count(), { timeout: 30000 }).toBeGreaterThan(0);
  await page.locator("#entries .verse").first().click();
  await expect(page.locator("#readerView")).toBeVisible();
  await page.locator("#readerMakeImage").click();
  await expect(page.locator("#imageStudioView")).toBeVisible();
  await page.locator("#imageStudioBack").click();
  await expect(page.locator("#readerView")).toBeVisible();
  await expect(page).toHaveURL(/#\/read\//);
});


test("notebook keeps snapshot-backed history and notes and restores them", async ({ page }) => {
  await page.goto("./#/notebook");
  const snapshot = { id: "notebook-snapshot-test", title: "اثر آزمایشی دفتر", body: "متن ذخیره‌شده باید باقی بماند.", author: "آزمون", tags: [], type: "poem" };
  const backup = {
    format: "yek-estekan-sher-notebook",
    version: 1,
    favorites: [{ id: snapshot.id, contentId: snapshot.id, itemSnapshot: snapshot, createdAt: new Date().toISOString() }],
    history: [{ id: snapshot.id, contentId: snapshot.id, itemSnapshot: snapshot, readAt: new Date().toISOString() }],
    notes: [{ id: snapshot.id, contentId: snapshot.id, itemSnapshot: snapshot, text: "یادداشت آزمایشی", updatedAt: new Date().toISOString() }],
    collections: [],
    settings: []
  };
  await page.locator("#restoreFile").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup))
  });
  await expect(page.locator("#notebookItems")).toContainText("اثر آزمایشی دفتر");
  await page.locator("#notebookTabs button").filter({ hasText: "تاریخچه" }).click();
  await expect(page.locator("#notebookItems")).toContainText("اثر آزمایشی دفتر");
  await page.locator("#notebookTabs button").filter({ hasText: "یادداشت‌ها" }).click();
  await expect(page.locator("#notebookItems")).toContainText("یادداشت آزمایشی");
});

test("Escape returns to the page from which a poem was opened", async ({ page }) => {
  await page.goto("./#/favorites");
  await page.evaluate(async () => {
    const item = { id: "escape-route-test", title: "آزمون بازگشت", body: "متن آزمون", author: "آزمون", tags: [], type: "poem" };
    await window.YESStorage.put("favorites", { id: item.id, contentId: item.id, itemSnapshot: item, createdAt: new Date().toISOString() });
  });
  await page.reload();
  await page.locator(".v16-favorite-open").click();
  await expect(page.locator("#readerView")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/#\/favorites$/);
  await expect(page.locator("#favoritesPageView")).toBeVisible();
});


test("all archive poems load before the site is revealed", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Full archive download is verified once on desktop.");
  test.setTimeout(240000);
  await page.goto("./");
  await expect(page.locator("#archiveBoot")).toBeVisible();
  await expect(page.locator("#homePageView")).toBeHidden();
  await page.waitForFunction(() => window.YESArchive?.loadedCount() === 56880, null, { timeout: 210000 });
  await expect(page.locator("#archiveBoot")).toBeHidden({ timeout: 30000 });
  await expect(page.locator("#homePageView")).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const fmt = n => new Intl.NumberFormat("fa-IR").format(n);
    const poems = window.poemEntries.filter(x => x.section === "poems").length;
    const texts = window.poemEntries.filter(x => x.section === "texts").length;
    return document.querySelector("#statPoems").textContent === fmt(poems)
      && document.querySelector("#statTexts").textContent === fmt(texts)
      && document.querySelector("#statTotal").textContent === fmt(poems + texts);
  }), { timeout: 15000 }).toBeTruthy();
  expect(await page.evaluate(() => window.YESArchive.loadedCategories())).toBe(9);
  await page.context().setOffline(true);
  await page.reload();
  await expect(page.locator("#archiveBoot")).toBeVisible();
  await page.waitForFunction(() => window.YESArchive?.loadedCount() === 56880, null, { timeout: 30000 });
  await expect(page.locator("#archiveBoot")).toBeHidden({ timeout: 30000 });
  await page.context().setOffline(false);
});
