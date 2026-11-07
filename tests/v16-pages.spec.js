const { test, expect } = require("@playwright/test");

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
