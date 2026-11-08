const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.__YES_TEST_SKIP_ARCHIVE_GATE = true; });
});

test("v1.8 taxonomy assigns a three-level path without changing source text or tags", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  const result = await page.evaluate(() => {
    const item = {
      id: "taxonomy-test-ali",
      section: "poems",
      tags: ["مدح و مناقب امیرالمؤمنین"],
      body: "به نام علی، چراغ هدایت و راه عدالت",
      author: "آزمون"
    };
    const original = { body: item.body, tags: [...item.tags], id: item.id };
    window.YES_TAXONOMY.classify(item);
    return {
      category1: item.category1,
      category2: item.category2,
      category3: item.category3,
      confidence: item.taxonomyConfidence,
      version: item.taxonomyVersion,
      unchanged: item.body === original.body && item.id === original.id &&
        JSON.stringify(item.tags) === JSON.stringify(original.tags)
    };
  });
  expect(result.category1).toBe("مذهبی");
  expect(result.category2).toContain("امیرالمؤمنین");
  expect(result.category3).toBe("عدالت و سیره");
  expect(result.version).toBe("1.8.0");
  expect(result.unchanged).toBeTruthy();
});

test("v1.8 taxonomy does not classify a bare ambiguous name as a sacred person", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  const result = await page.evaluate(() => {
    const item = { id: "taxonomy-test-ambiguous", section: "poems", tags: [], body: "فاطمه آمد و سخن گفت" };
    window.YES_TAXONOMY.classify(item);
    return { category1: item.category1, category2: item.category2, review: item.taxonomyReview };
  });
  expect(result.category1).toBe("عمومی");
  expect(result.category2).not.toContain("حضرت فاطمه");
  expect(result.review).toBeTruthy();
});

test("v1.8 taxonomy retains archive provenance and maps broad archive classes", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  const result = await page.evaluate(() => {
    const item = { id: "taxonomy-test-archive", section: "poems", tags: [], body: "بیت نمونه", archiveCategory: "حکمی و اخلاقی" };
    window.YES_TAXONOMY.classify(item);
    return { first: item.category1, second: item.category2, third: item.category3, source: item.sourceCategory, review: item.taxonomyReview };
  });
  expect(result.first).toBe("عمومی");
  expect(result.second).toBe("حکمت و اخلاق");
  expect(result.third).toBeTruthy();
  expect(result.source).toBe("حکمی و اخلاقی");
  expect(result.review).toContain("بازبینی");
});


test("v1.8 library exposes third-level subtopic browsing", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/library");
  await expect(page.locator(".v15-library-group h3").filter({ hasText: "زیرموضوع‌ها" })).toBeVisible();
  await expect(page.locator(".v15-library-group h3").filter({ hasText: "گنجینهٔ موضوعی" })).toBeVisible();
});


test("v1.8 sacred-person branches distinguish mourning from praise", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  const result = await page.evaluate(() => {
    const item = { id: "taxonomy-test-mourning", section: "poems", tags: ["کربلا و عاشورا"], body: "در عزای حسین اشک از دیده روان شد" };
    window.YES_TAXONOMY.classify(item);
    return { first: item.category1, person: item.category2, subtopic: item.category3 };
  });
  expect(result.first).toBe("مذهبی");
  expect(result.person).toContain("امام حسین");
  expect(result.subtopic).toBe("شهادت و سوگ");
});


test("religious legacy tags remain under the religious first-level branch", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  const result = await page.evaluate(() => {
    const item = { id: "taxonomy-test-legacy-religious", section: "poems", tags: ["دینی و آیینی"], body: "متن آیینی نمونه" };
    window.YES_TAXONOMY.classify(item);
    return { first: item.category1, second: item.category2 };
  });
  expect(result.first).toBe("مذهبی");
  expect(result.second).toBe("مناسبت‌ها و آیین‌های دینی");
});


test("v1.8 keeps multiple legacy subjects as secondary facets", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  const result = await page.evaluate(() => {
    const item = {
      id: "taxonomy-test-multi",
      tags: ["عاشقانه و دلدادگی", "حکمت و اخلاق"],
      body: "عشق و خرد دو چراغ راه انسان‌اند"
    };
    window.YES_TAXONOMY.classify(item);
    return { primary: item.category2, alternates: item.category2Alternates, topics: item.taxonomyTopics };
  });
  expect(result.primary).toBe("عاشقانه و دلدادگی");
  expect(result.alternates).toContain("حکمت و اخلاق");
  expect(result.topics).toContain("حکمت و اخلاق");
});

test("v1.8 taxonomy is synchronized to the reader's normalized content records", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  const result = await page.evaluate(() => {
    const item = window.YESContent.get("poem-0001");
    return item && {
      category1: item.category1,
      category2: item.category2,
      category3: item.category3,
      version: item.taxonomyVersion
    };
  });
  expect(result).toBeTruthy();
  expect(result.category1).toBeTruthy();
  expect(result.category2).toBeTruthy();
  expect(result.category3).toBeTruthy();
  expect(result.version).toBe("1.8.0");
});


test("v1.8 archive search filters the source shard and exposes its taxonomy subtopics", async ({ page, baseURL }) => {
  test.setTimeout(60000);
  await page.goto(baseURL + "#/search");
  await page.waitForFunction(() => window.YESArchive?.manifestData?.categories?.length === 9);
  await page.locator("#category1Filter").selectOption({ label: "عمومی" });
  await page.locator("#category2Filter").selectOption({ label: "حماسی و ملی" });
  expect(await page.evaluate(() => window.YESArchive.isArchiveCategory(document.querySelector("#category2Filter").value))).toBeTruthy();
  await expect.poll(() => page.evaluate(() => window.YESArchive.loaded("حماسی و ملی")), { timeout: 30000 }).toBeTruthy();
  await expect(page.locator("#entries .entry").first()).toBeVisible();
  await expect(page.locator("#category3Filter option").filter({ hasText: "میهن و پهلوانی" })).toHaveCount(1);
});
