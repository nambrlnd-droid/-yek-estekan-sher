const { test, expect } = require("@playwright/test");
const { gzipSync } = require("node:zlib");

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


test("archive bootstrap retries a transient shard failure and completes the full gate", async ({ page }) => {
  await page.addInitScript(() => { window.__YES_TEST_SKIP_ARCHIVE_GATE = true; });
  const manifest = {
    total: 2,
    categories: [
      { name: "آزمایش اول", file: "first.json.gz", count: 1 },
      { name: "آزمایش دوم", file: "second.json.gz", count: 1 }
    ]
  };
  const attempts = new Map();
  await page.route("**/data/poetry-archive/manifest.json", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(manifest) })
  );
  await page.route(url => url.pathname.includes("/data/poetry-archive/") && url.pathname.endsWith(".json.gz"), async route => {
    const name = new URL(route.request().url()).pathname.split("/").pop();
    const count = (attempts.get(name) || 0) + 1;
    attempts.set(name, count);
    if (name === "first.json.gz" && count === 1) {
      await route.abort("failed");
      return;
    }
    const record = {
      id: "bootstrap-" + name,
      section: "poems",
      body: "متن آزمایشی " + name,
      author: "آزمایش"
    };
    await route.fulfill({
      status: 200,
      contentType: "application/gzip",
      body: gzipSync(Buffer.from(JSON.stringify([record])))
    });
  });

  await page.goto("./");
  const result = await page.evaluate(async () => {
    const loadingEvents = [];
    window.addEventListener("yes:archive-loading", event => loadingEvents.push(event.detail.category));
    const total = await window.YESArchive.loadAll();
    return { total, loaded: window.YESArchive.loadedCount(), categories: window.YESArchive.loadedCategories(), loadingEvents };
  });
  expect(result).toEqual({
    total: 2,
    loaded: 2,
    categories: 2,
    loadingEvents: ["آزمایش اول", "آزمایش دوم"]
  });
  expect(attempts.get("first.json.gz")).toBe(2);
  expect(attempts.get("second.json.gz")).toBe(1);
});
