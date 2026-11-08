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
    const webItems = content.filter(x => String(x.id).startsWith("ganjoor-"));
    const legacyItems = content.filter(x => !x.archiveCategory && !String(x.id).startsWith("ganjoor-") && !pinnedIds.has(String(x.id)));
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
    const sourceInventory = window.YES_SOURCE_AUDIT || {};
    const sourceRows = Object.values(sourceInventory).reduce((sum, item) => sum + (item.sourceRows || 0), 0);
    const sourceAdded = Object.values(sourceInventory).reduce((sum, item) => sum + (item.added || 0), 0);
    const sourceDuplicateSkipped = Object.values(sourceInventory).reduce((sum, item) => sum + (item.duplicateBodySkipped || 0), 0);
    const report = {
      sourceInventory,
      sourceRows,
      sourceAdded,
      sourceDuplicateSkipped,
      sourceAddedMatchesRuntime: sourceAdded === legacyItems.length + webItems.length + pinned.length,
      manifestTotal: manifest?.total || 0,
      archiveRecords: shard.length,
      archiveItemsInContent: archiveItems.length,
      archiveRecordsInLiveLibrary: (window.poemEntries || []).filter(x => x.archiveCategory).length,
      legacyPoems: legacyItems.length,
      pinnedRecords: pinned.length,
      webHafezRecords: webItems.length,
      telegramImportedSourceRows: window.telegramArchiveImported || 0,
      crossSourceOrRepeatedBodies: crossSourceBodies,
      duplicateIdsAcrossSources: duplicateIds,
      duplicateBodyAnnotations: shard.filter(x => x.normalizedBodyDuplicate).length,
      missingTaxonomyInReaderContent: missingTaxonomy,
      taxonomySummaryTotal: window.YES_TAXONOMY?.total || 0,
      taxonomySummaryReview: window.YES_TAXONOMY?.review || 0,
      readerContentTotal: content.length,
      firstLevelCounts: ["مذهبی", "عمومی"].map(label => ({
        label,
        count: content.filter(x => x.category1 === label).length
      })),
      reviewQueue: content.filter(x => x.taxonomyReview).length,
      reviewByReason: [...new Set(content.map(x => x.taxonomyReview).filter(Boolean))].map(reason => ({
        reason, count: content.filter(x => x.taxonomyReview === reason).length
      })),
      confidenceCounts: ["high", "medium", "low"].map(level => ({
        level, count: content.filter(x => x.taxonomyConfidence === level).length
      })),
      secondLevelCount: new Set(content.map(x => x.category2).filter(Boolean)).size,
      thirdLevelCount: new Set(content.map(x => x.category3).filter(Boolean)).size,
      multiTopicRecords: content.filter(x => (x.category2Alternates || []).length > 0).length,
      sampleReviewIds: content.filter(x => x.taxonomyReview).slice(0, 10).map(x => x.id),
      archiveIdCollisionsWithLegacy: shard.filter(x => legacyIds.has(String(x.id))).length
    };
    window.__YES_V18_SOURCE_AUDIT = report;
    return report;
  });
  console.log("V1.8_CROSS_SOURCE_AUDIT", JSON.stringify(report));
  expect(report.sourceInventory["poems.js"]?.sourceRows).toBe(100);
  expect(report.sourceInventory["poems-extra.js"]?.sourceRows).toBe(99);
  expect(report.sourceInventory["poems-hasan-collection.js"]?.sourceRows).toBe(26);
  expect(report.sourceInventory["poems-user-collection.js"]?.sourceRows).toBe(100);
  expect(report.sourceInventory["telegram-poems.js"]?.sourceRows).toBe(1844);
  expect(report.sourceInventory["internet-poems.js"]?.sourceRows).toBe(200);
  expect(report.sourceInventory["pinned.js"]?.sourceRows).toBe(19);
  expect(report.sourceRows).toBeGreaterThanOrEqual(2388);
  expect(report.sourceAddedMatchesRuntime).toBeTruthy();
  expect(report.manifestTotal).toBe(56880);
  expect(report.archiveRecords).toBe(56880);
  expect(report.archiveItemsInContent).toBe(56880);
  expect(report.archiveRecordsInLiveLibrary).toBe(56880);
  expect(report.archiveIdCollisionsWithLegacy).toBe(0);
  expect(report.duplicateIdsAcrossSources).toBe(0);
  expect(report.legacyPoems).toBeGreaterThan(0);
  expect(report.pinnedRecords).toBe(19);
  expect(report.missingTaxonomyInReaderContent).toBe(0);
  expect(report.taxonomySummaryTotal).toBe(report.readerContentTotal);
  expect(report.taxonomySummaryReview).toBe(report.reviewQueue);
});
