const { test, expect } = require("@playwright/test");

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
