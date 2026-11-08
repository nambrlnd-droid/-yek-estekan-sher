const { test, expect } = require("@playwright/test");

test("prosody analyzer preserves source and never invents a confirmed meter", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  const result = await page.evaluate(() => {
    const item = { id: "prosody-test-1", body: "بهار آمد و گل از خاک سر برآورد\nنسیم صبحگاهی خبر آورد", author: "آزمون" };
    const original = item.body;
    const analysis = window.YESProsody.analyze(item);
    return { status: analysis.status, meter: analysis.meter, bahr: analysis.bahr, type: analysis.poemType, preserved: item.body === original };
  });
  expect(result.status).toBe("review_required");
  expect(result.meter).toBeNull();
  expect(result.bahr).toBeNull();
  expect(result.type).toBe("couplet");
  expect(result.preserved).toBeTruthy();
});

test("prosody output explicitly distinguishes orthographic syllable estimates from scansion", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  const result = await page.evaluate(() => window.YESProsody.analyze({ body: "ای دل اگر عاشقی در پی دلدار باش" }));
  expect(result.syllableMethod).toBe("orthographic-estimate-not-pronunciation");
  expect(result.reviewReasons.length).toBeGreaterThan(0);
  expect(result.status).not.toBe("confirmed");
});

test("advanced search filters are present and compose with existing search", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  await expect(page.locator("#prosodyTypeFilter")).toBeVisible();
  await expect(page.locator("#prosodyMeterFilter")).toBeVisible();
  await expect(page.locator("#prosodyRhymeFilter")).toBeVisible();
  await expect(page.locator("#prosodyRadifFilter")).toBeVisible();
  const result = await page.evaluate(() => {
    const item = { body: "بهار آمد و گل از خاک سر برآورد\nنسیم صبحگاهی خبر آورد" };
    const initial = window.YESAdvancedSearch.matches(item);
    document.getElementById("prosodyTypeFilter").value = "couplet";
    document.getElementById("prosodyTypeFilter").dispatchEvent(new Event("input", { bubbles: true }));
    const couplet = window.YESAdvancedSearch.matches(item);
    document.getElementById("prosodyTypeFilter").value = "multi-line";
    document.getElementById("prosodyTypeFilter").dispatchEvent(new Event("input", { bubbles: true }));
    const multi = window.YESAdvancedSearch.matches(item);
    return { initial, couplet, multi };
  });
  expect(result.initial).toBeTruthy();
  expect(result.couplet).toBeTruthy();
  expect(result.multi).toBeFalsy();
});

test("weight search excludes unverified automatic guesses", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  const result = await page.evaluate(() => {
    const item = { body: "نمونهٔ شعر", prosody: { status: "review_required", meter: "فاعلاتن", bahr: "رمل", poemType: "single-line" } };
    document.getElementById("prosodyMeterFilter").value = "رمل";
    document.getElementById("prosodyMeterFilter").dispatchEvent(new Event("input", { bubbles: true }));
    return window.YESAdvancedSearch.matches(item);
  });
  expect(result).toBeFalsy();
});

test("related poem suggestions prioritize shared taxonomy topics", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  const result = await page.evaluate(() => {
    const source = { id: "source", title: "علی", body: "عدالت و مردانگی", category1: "مذهبی", category2: "امیرالمؤمنین علیه‌السلام", category3: "عدالت و سیره" };
    const related = { id: "related", title: "سیره", body: "عدالت و سیره", category1: "مذهبی", category2: "امیرالمؤمنین علیه‌السلام", category3: "عدالت و سیره" };
    const unrelated = { id: "other", title: "باران", body: "باران و دریا", category1: "عمومی", category2: "طبیعت و توصیف", category3: "فصل‌ها" };
    return window.YESAdvancedSearch.similar(source, [source, unrelated, related], 3).map(x => x.item.id);
  });
  expect(result[0]).toBe("related");
  expect(result).not.toContain("source");
});
