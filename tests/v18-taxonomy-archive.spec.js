const { test, expect } = require("@playwright/test");
test.setTimeout(240000);

test("v1.8 full archive receives all three taxonomy levels after boot", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  await page.waitForFunction(() => window.YESArchive?.loadedCount() === 56880, null, { timeout: 210000 });
  const report = await page.evaluate(() => {
    const records = window.poemEntries || [];
    const archive = window.YESArchive;
    const manifest = archive.manifestData;
    const shardRecords = (manifest?.categories || []).flatMap(category => archive.items(category.name));
    const missing = records.filter(item => !item.category1 || !item.category2 || !item.category3);
    const missingShard = shardRecords.filter(item => !item.category1 || !item.category2 || !item.category3);
    const review = shardRecords.filter(item => item.taxonomyReview).length;
    return {
      manifestTotal: manifest?.total || 0,
      loadedTotal: archive.loadedCount(),
      shardTotal: shardRecords.length,
      missingLive: missing.length,
      missingShard: missingShard.length,
      review,
      levels: [...new Set(records.map(item => item.category1))]
    };
  });
  expect(report.manifestTotal).toBe(56880);
  expect(report.loadedTotal).toBe(56880);
  expect(report.shardTotal).toBe(56880);
  expect(report.missingLive).toBe(0);
  expect(report.missingShard).toBe(0);
  expect(report.levels).toContain("مذهبی");
  expect(report.levels).toContain("عمومی");
  expect(report.review).toBeGreaterThanOrEqual(0);
});

test("archive loader rejects a shard whose SHA-256 does not match the manifest", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  const result = await page.evaluate(async () => {
    const bytes = new TextEncoder().encode("abc").buffer;
    const valid = await window.YESArchive.verifyShard(bytes, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "test-shard");
    let rejected = false;
    try {
      await window.YESArchive.verifyShard(bytes, "0000000000000000000000000000000000000000000000000000000000000000", "tampered-shard");
    } catch (error) {
      rejected = String(error.message || error).includes("SHA-256");
    }
    return { valid, rejected };
  });
  expect(result.valid).toBeTruthy();
  expect(result.rejected).toBeTruthy();
});
