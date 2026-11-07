const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.__YES_TEST_SKIP_ARCHIVE_GATE = true; });
});

test("v1.7 archive worker decompresses and parses a gzip shard off the main thread", async ({ page }) => {
  await page.goto("./");
  const result = await page.evaluate(async () => {
    const payload = [{ id: "worker-check-1", body: "آزمایش گنجینه", author: "آزمایش" }];
    const compressed = await new Response(
      new Blob([JSON.stringify(payload)]).stream().pipeThrough(new CompressionStream("gzip"))
    ).arrayBuffer();
    return await new Promise((resolve, reject) => {
      const worker = new Worker("./js/archive-worker.js");
      const timeout = setTimeout(() => { worker.terminate(); reject(new Error("archive worker timeout")); }, 5000);
      worker.onmessage = event => {
        clearTimeout(timeout);
        worker.terminate();
        resolve(event.data);
      };
      worker.onerror = error => {
        clearTimeout(timeout);
        worker.terminate();
        reject(error);
      };
      worker.postMessage(compressed, [compressed]);
    });
  });
  expect(result.error).toBeUndefined();
  expect(result.records).toEqual([{ id: "worker-check-1", body: "آزمایش گنجینه", author: "آزمایش" }]);
});

test("v1.7 reusable search matcher preserves Persian matching and ranking", async ({ page }) => {
  await page.goto("./#/search");
  const result = await page.evaluate(() => {
    const item = { title: "آزمایش فارسی", body: "به نام خداوند جان و خرد", author: "فردوسی", tags: ["حماسی"] };
    const matcher = window.YESSearch.createMatcher("فردوسی حماسی");
    return {
      matches: matcher.matches(item),
      score: matcher.score(item),
      legacyMatches: window.YESSearch.matches(item, "فردوسی حماسی"),
      emptyMatches: window.YESSearch.createMatcher("").matches(item),
      emptyScore: window.YESSearch.createMatcher("").score(item),
      normalized: window.YESSearch.normalize("ي ك")
    };
  });
  expect(result.matches).toBeTruthy();
  expect(result.score).toBeGreaterThan(0);
  expect(result.legacyMatches).toBe(result.matches);
  expect(result.emptyMatches).toBeTruthy();
  expect(result.emptyScore).toBe(0);
  expect(result.normalized).toBe("ی ک");
});

test("v1.7 search view keeps the visible result batch bounded", async ({ page }) => {
  await page.goto("./#/search");
  await expect.poll(() => page.locator("#entries .entry").count(), { timeout: 30000 }).toBeGreaterThan(0);
  await expect(page.locator("#entries .entry")).toHaveCount(10);
  await page.locator("#displayCount").selectOption("50");
  await expect.poll(() => page.locator("#entries .entry").count()).toBeLessThanOrEqual(50);
});
