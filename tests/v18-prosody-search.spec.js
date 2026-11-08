const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__YES_TEST_SKIP_ARCHIVE_GATE = true;
    window.__YES_TEST_FORCE_ARCHIVE_ERROR = false;
  });
});

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
  await page.goto(baseURL + "#/search");
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

test("stage 5 creates a deep-linkable poet profile and opens works", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  await page.evaluate(() => {
    window.YESContent.all.push({
      id: "stage5-poet-work", type: "poem", title: "نمونهٔ صفحهٔ شاعر",
      body: "این یک شعر آزمایشی است", author: "شاعر آزمایشی",
      tags: ["آزمایش"], category1: "عمومی", category2: "تأمل و اندیشه",
      category3: "هستی و شناخت"
    });
    location.hash = "#/poet/" + encodeURIComponent("شاعر آزمایشی");
  });
  await expect(page.locator("#poetPageView")).toBeVisible();
  await expect(page.locator("#poetPageName")).toHaveText("شاعر آزمایشی");
  await expect(page.locator(".poet-work")).toHaveCount(1);
  await page.locator(".poet-work").click();
  await expect(page.locator("#readerView")).toBeVisible();
  await expect(page.locator("#readerTitle")).toHaveText("نمونهٔ صفحهٔ شاعر");
});

test("poem page exposes taxonomy, prosody status, share and correction link", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  await page.evaluate(() => {
    window.YESContent.all.push({
      id: "stage5-reader-work", type: "poem", title: "اثر با شناسنامه",
      body: "مصراع نخست\nمصراع دوم", author: "شاعر دارای صفحه",
      tags: ["آزمایش"], category1: "عمومی", category2: "طبیعت و توصیف",
      category3: "فصل‌ها و پدیده‌های طبیعی"
    });
    window.YESReader.open("stage5-reader-work");
  });
  await expect(page.locator("#readerTitle")).toHaveText("اثر با شناسنامه");
  await expect(page.locator("#readerAuthor a")).toHaveAttribute("href", /#\/poet\//);
  await expect(page.locator("#readerMetadata")).toContainText("طبیعت و توصیف");
  await expect(page.locator("#readerProsody")).toBeVisible();
  await expect(page.locator("#readerProsody")).toContainText("تأیید نشده");
  await expect(page.locator("#readerProsody")).toContainText("قافیهٔ پیشنهادی");
  await expect(page.locator("#readerProsody")).toContainText("ردیف پیشنهادی");
  await expect(page.locator(".reader-report a")).toHaveAttribute("href", /github.com\/nambrlnd-droid\/\-yek-estekan-sher\/issues\/new/);
});

test("human prosody review is saved locally and becomes searchable as confirmed", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  await page.evaluate(() => {
    const item = { id: "stage3-human-review", type: "poem", title: "آزمون بازبینی", body: "مصراع یک\nمصراع دو", author: "آزمون", tags: [] };
    window.YESContent.all.push(item);
    window.poemEntries.push(item);
    window.YESReader.open(item.id);
  });
  await page.locator("#readerProsodyReviewToggle").click();
  await page.locator("#readerProsodyMeter").fill("فعولن فعولن فعولن فعل");
  await page.locator("#readerProsodyBahr").fill("متقارب مثمن محذوف");
  await page.locator("#readerProsodyScansion").fill("U ـ ـ | U ـ ـ | U ـ ـ | U ـ");
  await page.locator("#readerProsodyVerified").check();
  await page.locator("#readerProsodySave").click();
  await expect(page.locator("#readerProsodyReviewStatus")).toContainText("ارکان");
  await page.locator("#readerProsodyArkan").fill("فعولن × ۳، فعل");
  await page.locator("#readerProsodySave").click();
  await expect(page.locator("#readerProsodyReviewStatus")).toContainText("ذخیره شد");
  const status = await page.evaluate(async () => (await window.YESStorage.get("prosodyReview", "stage3-human-review")).status);
  expect(status).toBe("confirmed");
  await page.goto(baseURL + "#/search");
  await page.locator("#prosodyMeterFilter").fill("متقارب");
  const match = await page.evaluate(() => window.YESAdvancedSearch.matches(window.poemEntries.find(x => x.id === "stage3-human-review")));
  expect(match).toBeTruthy();
});

test("all public version labels are unified to V1.8", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  await expect(page).toHaveTitle(/نسخهٔ ۱\.۸/);
  await expect(page.locator(".site-header .version")).toHaveText("نسخهٔ ۱.۸");
  await expect(page.locator("footer")).toContainText("نسخهٔ ۱.۸");
  const visibleLabels = await page.locator(".version").allTextContents();
  expect(visibleLabels).toEqual(["نسخهٔ ۱.۸"]);
  const html = await page.content();
  expect(html).not.toContain("نسخهٔ ۱.۷");
});


test("full-screen archive gate opens only after the archive-ready signal", async ({ page, baseURL }) => {
  await page.goto(baseURL + "#/home");
  await expect(page.locator("#archiveBootScreen")).toBeAttached();
  await expect(page.locator("#archiveBootScreen")).toBeHidden();
  const ready = await page.evaluate(() => window.__YES_ARCHIVE_READY === true && window.YESArchiveGate?.isReady() === true);
  expect(ready).toBeTruthy();
});


test("archive loading failure keeps the site covered and offers retry", async ({ page, baseURL }) => {
  await page.goto(baseURL + "?yesTestArchiveError=1#/home");
  await expect(page.locator("#archiveBootScreen")).toBeVisible();
  await expect(page.locator("#archiveBootScreen")).toHaveClass(/has-error/);
  await expect(page.locator("#archiveBootRetry")).toBeVisible();
  await expect(page.locator("#archiveBootMessage")).toContainText("بارگذاری کامل نشد");
  await page.locator("#archiveBootRetry").click();
  await expect(page.locator("#archiveBootScreen")).toBeVisible();
  await expect(page.locator("#archiveBootRetry")).toBeVisible();
});
