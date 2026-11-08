import { test, expect } from "@playwright/test";


test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.__YES_TEST_SKIP_ARCHIVE_GATE = true; });
});

test("external P3R exact matches are searchable but remain distinct from human confirmation", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/search");
  const result = await page.evaluate(() => {
    const item = { id: "p3r-external", body: "مصراع یک\\nمصراع دو", prosody: {
      status: "external_source_matched", meter: "فاعلاتن فاعلاتن فاعلاتن فاعلن",
      bahr: null, arkan: "فاعلاتن فاعلاتن فاعلاتن فاعلن"
    }};
    document.getElementById("prosodyMeterFilter").value = "فاعلاتن";
    document.getElementById("prosodyMeterFilter").dispatchEvent(new Event("input", { bubbles: true }));
    const meterMatch = window.YESAdvancedSearch.matches(item);
    document.getElementById("prosodyReviewFilter").value = "external_source_matched";
    document.getElementById("prosodyReviewFilter").dispatchEvent(new Event("input", { bubbles: true }));
    const externalStatusMatch = window.YESAdvancedSearch.matches(item);
    document.getElementById("prosodyReviewFilter").value = "confirmed";
    document.getElementById("prosodyReviewFilter").dispatchEvent(new Event("input", { bubbles: true }));
    const humanConfirmedMatch = window.YESAdvancedSearch.matches(item);
    return { meterMatch, externalStatusMatch, humanConfirmedMatch };
  });
  expect(result.meterMatch).toBeTruthy();
  expect(result.externalStatusMatch).toBeTruthy();
  expect(result.humanConfirmedMatch).toBeFalsy();
});

test("the published exact-match index applies real source annotations to local poems", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  const result = await page.evaluate(async () => {
    const outcome = await window.YESProsodyCorpus.apply(window.YESContent.all);
    const matched = window.YESContent.all.find(item => item.prosody?.status === "external_source_matched");
    return {
      available: outcome.available,
      indexRecords: outcome.indexRecords,
      applied: outcome.applied,
      status: matched?.prosody?.status,
      meter: matched?.prosody?.meter,
      poemType: matched?.prosody?.poemType,
      source: matched?.prosody?.sourceDataset
    };
  });
  expect(result.available).toBeTruthy();
  expect(result.indexRecords).toBeGreaterThan(0);
  expect(result.applied).toBeGreaterThan(0);
  expect(result.status).toBe("external_source_matched");
  expect(result.meter).toBeTruthy();
  expect(result.poemType).toBeTruthy();
  expect(result.source).toBeTruthy();
});


test("batch analysis preserves external-source meter annotations instead of replacing them with provisional estimates", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  const result = await page.evaluate(async () => {
    const id = "preserve-external-prosody";
    const item = { id, body: "بهار آمد و گل‌ها شکفتند\\nجهان از عطر باران تازه شد" };
    const imported = {
      id,
      status: "external_source_matched",
      confidence: "multiple_exact_couplets",
      meter: "فاعلاتن فاعلاتن فاعلاتن فاعلن",
      bahr: "رمل",
      arkan: "فاعلاتن فاعلاتن فاعلاتن فاعلن",
      sourceDataset: "P3R",
      version: "1.8.2-multi-source-exact-match"
    };
    let persisted = null;
    await window.YESProsody.analyzeAll([item], {
      existingProfiles: new Map([[id, imported]]),
      onBatch: async batch => { persisted = batch[0]; }
    });
    return {
      status: item.prosody?.status,
      meter: item.prosody?.meter,
      source: item.prosody?.sourceDataset,
      persistedStatus: persisted?.status,
      persistedMeter: persisted?.meter
    };
  });
  expect(result.status).toBe("external_source_matched");
  expect(result.meter).toBe("فاعلاتن فاعلاتن فاعلاتن فاعلن");
  expect(result.source).toBe("P3R");
  expect(result.persistedStatus).toBe("external_source_matched");
  expect(result.persistedMeter).toBe("فاعلاتن فاعلاتن فاعلاتن فاعلن");
});
