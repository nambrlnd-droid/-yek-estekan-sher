const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.__YES_TEST_SKIP_ARCHIVE_GATE = true; });
});

test("image studio exposes expanded Persian fonts and twelve design templates", async ({ page }) => {
  await page.goto("./#/search");
  await expect(page.locator("#openImageStudio")).toBeVisible();
  await page.locator("#openImageStudio").click();
  await expect(page.locator("#imageStudioView")).toBeVisible();
  await expect(page.locator("#imageFont option")).toHaveCount(8);
  await expect(page.locator("#imageTemplate option")).toHaveCount(12);
  await expect(page.locator("#imageTheme option")).toHaveCount(15);
  await expect(page.locator("#imagePresetButtons button")).toHaveCount(12);
  await expect(page.locator("#imagePattern")).toHaveValue("arch");
  await expect(page.locator("#imageFrame")).toHaveValue("ornate");
  await expect(page.locator("#imageFont")).toHaveValue("Noto Naskh Arabic");

  await page.locator("#imageTemplate").selectOption("garden");
  await expect(page.locator("#imageTheme")).toHaveValue("garden");
  await expect(page.locator("#imagePattern")).toHaveValue("leaves");
  await expect(page.locator("#imageFont")).toHaveValue("Amiri");
  await page.locator('[data-template="tile"]').click();
  await expect(page.locator("#imageTheme")).toHaveValue("tile");
  await expect(page.locator("#imagePattern")).toHaveValue("geometry");
  await expect(page.locator("#imageFont")).toHaveValue("Noto Naskh Arabic");

  await page.locator("#imageFont").selectOption("Amiri");
  await page.locator("#imageFontWeight").selectOption("700");
  await page.locator("#imageFormat").selectOption("square");
  await page.locator("#imageText").fill("به نام خداوند جان و خرد\nکزین برتر اندیشه برنگذرد");
  await page.locator("#imageAuthor").fill("فردوسی");
  await expect.poll(() => page.locator("#poetryCanvas").evaluate(c => [c.width, c.height])).toEqual([1200, 1200]);
  await expect.poll(() => page.locator("#poetryCanvas").evaluate(c => c.toDataURL("image/png").length)).toBeGreaterThan(1000);
  await expect.poll(() => page.evaluate(async () => (await window.YESStorage.get("settings", "image-studio"))?.imageFont)).toBe("Amiri");
  await page.evaluate(() => history.replaceState(null, "", location.pathname + "#/search"));
  await page.reload();
  await expect(page.locator("#openImageStudio")).toBeVisible();
  await page.locator("#openImageStudio").click();
  await expect(page.locator("#imageStudioView")).toBeVisible();
  await expect(page.locator("#imageFont")).toHaveValue("Amiri");
  await expect(page.locator("#imageFormat")).toHaveValue("square");
  await page.locator("#imageReset").click();
  await expect(page.locator("#imageFormat")).toHaveValue("portrait");
  await expect(page.locator("#imageFont")).toHaveValue("Noto Naskh Arabic");
  await page.locator("#imageFormat").selectOption("square");

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#imageDownload").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
});

test("image studio supports story and landscape export dimensions", async ({ page }) => {
  await page.goto("./#/search");
  await expect(page.locator("#openImageStudio")).toBeVisible();
  await page.locator("#openImageStudio").click();
  await page.locator("#imageFormat").selectOption("story");
  await expect.poll(() => page.locator("#poetryCanvas").evaluate(c => [c.width, c.height])).toEqual([1080, 1920]);
  await page.locator("#imageFormat").selectOption("landscape");
  await expect.poll(() => page.locator("#poetryCanvas").evaluate(c => [c.width, c.height])).toEqual([1600, 900]);
});
