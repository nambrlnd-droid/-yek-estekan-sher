const { test, expect } = require("@playwright/test");
test.setTimeout(300000);

test("v1.8 cross-source archive audit reports overlaps without deleting content", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  await page.waitForFunction(() => window.__YES_ARCHIVE_READY === true, null, { timeout: 240000 });
  await page.evaluate(async () => {
    if (window.YESWebPoemsReady) {
      await Promise.race([
        window.YESWebPoemsReady,
        new Promise(resolve => setTimeout(resolve, 25000))
      ]);
    }
  });
  const report = await page.evaluate(() => {
    const archive = window.YESArchive;
    const manifest = archive.manifestData;
    const shard = (manifest?.categories || []).flatMap(category => archive.items(category.name));
    const content = window.YESContent?.all || [];
    const pinnedIds = new Set((window.pinnedEntries || []).map(x => String(x.id)));
    const archiveItems = content.filter(x => x.archiveCategory);
    const webItems = content.filter(x => String(x.id).startsWith("web-hafez-"));
    const legacyItems = content.filter(x => !x.archiveCategory && !String(x.id).startsWith("web-hafez-") && !pinnedIds.has(String(x.id)));
    const legacyIds = new Set(legacyItems.map(x => String(x.id)));
    const pinned = content.filter(x => pinnedIds.has(String(x.id)));
    const key = value => String(value || "").normalize("NFKC")
      .replace(/[يى]/g, "ی").replace(/ك/g, "ک")
      .replace(/[\s\p{P}\p{S}\u200c\u200e\u200fـ]/gu, "").toLowerCase();
    const idCounts = new Map();
    for (const item of [...legacyItems, ...pinned, ...webItems, ...shard]) {
      const id = String(item.id || "");
      idCounts.set(id, (idCounts.get(id) || 0) + 1);
    }
    const bodyCounts = new Map();
    for (const item of [...legacyItems, ...pinned, ...webItems, ...shard]) {
      const body = key(item.body);
      if (body) bodyCounts.set(body, (bodyCounts.get(body) || 0) + 1);
    }
    const crossSourceBodies = [...bodyCounts.values()].filter(count => count > 1).length;
    const duplicateIds = [...idCounts.values()].filter(count => count > 1).length;
    const missingTaxonomy = content.filter(x => !x.category1 || !x.category2 || !x.category3).length;
    const report = {
      manifestTotal: manifest?.total || 0,
      archiveRecords: shard.length,
      archiveItemsInContent: archiveItems.length,
      legacyPoems: legacyItems.length,
      pinnedRecords: pinned.length,
      webHafezRecords: webItems.length,
      telegramImportedSourceRows: window.telegramArchiveImported || 0,
      crossSourceOrRepeatedBodies: crossSourceBodies,
      duplicateIdsAcrossSources: duplicateIds,
      missingTaxonomyInReaderContent: missingTaxonomy,
      firstLevelCounts: ["مذهبی", "عمومی"].map(label => ({
        label,
        count: content.filter(x => x.category1 === label).length
      })),
      reviewQueue: content.filter(x => x.taxonomyReview).length,
      sampleReviewIds: content.filter(x => x.taxonomyReview).slice(0, 10).map(x => x.id),
      archiveIdCollisionsWithLegacy: shard.filter(x => legacyIds.has(String(x.id))).length
    };
    window.__YES_V18_SOURCE_AUDIT = report;
    return report;
  });
  console.log("V1.8_CROSS_SOURCE_AUDIT", JSON.stringify(report));
  expect(report.manifestTotal).toBe(56880);
  expect(report.archiveRecords).toBe(56880);
  expect(report.archiveItemsInContent).toBe(56880);
  expect(report.legacyPoems).toBeGreaterThan(0);
  expect(report.pinnedRecords).toBe(19);
  expect(report.missingTaxonomyInReaderContent).toBe(0);
});
