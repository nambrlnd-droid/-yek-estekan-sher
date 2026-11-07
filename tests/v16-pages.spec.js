const { test, expect } = require("@playwright/test");

test.describe("Version 1.6 independent primary pages", () => {
  test("each primary destination opens its own routed view", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator("#v16PrimaryNav")).toBeVisible();

    await page.locator('#v16PrimaryNav a[data-route="library"]').click();
    await expect(page).toHaveURL(/#\/library$/);
    await expect(page.locator("#v15LibraryView")).toBeVisible();
    await expect(page.locator("#regularView")).toBeHidden();

    await page.locator('#v16PrimaryNav a[data-route="search"]').click();
    await expect(page).toHaveURL(/#\/search$/);
    await expect(page.locator("#search")).toBeVisible();
    await expect(page.locator("#v15LibraryView")).toBeHidden();

    await page.locator('#v16PrimaryNav a[data-route="favorites"]').click();
    await expect(page).toHaveURL(/#\/favorites$/);
    await expect(page.locator("#notebookView")).toBeVisible();
    await expect(page.locator("#notebookTabs button").first()).toHaveClass(/active/);

    await page.locator('#v16PrimaryNav a[data-route="notebook"]').click();
    await expect(page).toHaveURL(/#\/notebook$/);
    await expect(page.locator("#notebookView")).toBeVisible();
    await expect(page.locator("#notebookTabs button").nth(3)).toHaveClass(/active/);

    await page.locator('#v16PrimaryNav a[data-route="home"]').click();
    await expect(page).toHaveURL(/#\/home$/);
    await expect(page.locator("#regularView")).toBeVisible();
    await expect(page.locator("#siteStats")).toBeVisible();
  });

  test("library is directly addressable after a fresh page load", async ({ page }) => {
    await page.goto("./#/library");
    await expect(page.locator("#v15LibraryView")).toBeVisible();
    await expect(page.locator("#v16PrimaryNav a[data-route='library']")).toHaveAttribute("aria-current", "page");
  });

  test("five-page navigation remains visible on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("./");
    const links = page.locator("#v16PrimaryNav a");
    await expect(links).toHaveCount(5);
    await expect(links.first()).toBeVisible();
    await expect(links.last()).toBeVisible();
  });
});
