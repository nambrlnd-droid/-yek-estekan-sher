const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.__YES_TEST_SKIP_ARCHIVE_GATE = true; });
});

test("v1.8 taxonomy separates religious and general subjects", async ({ page }) => {
  await page.goto("./");
  const result = await page.evaluate(() => {
    const classify = item => { window.YES_TAXONOMY.classify(item); return item; };
    const ali = classify({ body: "به نام خدا، مدح امیرالمؤمنین و یاد غدیر", tags: ["مدح و مناقب امیرالمؤمنین"] });
    const hasan = classify({ body: "نام حسن مجتبی در شعر آمده است", tags: ["امام حسن مجتبی"] });
    const romantic = classify({ body: "دل به عشق تو سپردم و در انتظار وصالم", tags: ["عاشقانه و دلدادگی"] });
    const ambiguous = classify({ body: "متن کوتاه و بی‌نام", tags: [0, 0] });
    const text = classify({ section: "texts", body: "نامه‌ای برای دوست", tags: ["نامه‌ها و متون تاریخی"] });
    const multi = classify({ body: "یا زهرا، از نجف و زیارت بگو", tags: ["حضرت زهرا", "شوق زیارت و عتبات"] });
    return { ali, hasan, romantic, ambiguous, text, multi };
  });
  expect(result.ali.category1).toBe("مذهبی");
  expect(result.ali.category2).toContain("امیرالمؤمنین");
  expect(result.ali.category3).toBe("مدح و منقبت");
  expect(result.hasan.category2).toContain("امام حسن مجتبی");
  expect(result.romantic.category1).toBe("عمومی");
  expect(result.romantic.category2).toBe("عاشقانه و دلدادگی");
  expect(result.ambiguous.taxonomyReview).toBe("نیازمند بازبینی");
  expect(result.text.contentType).toBe("text");
  expect(result.multi.taxonomyPaths.length).toBeGreaterThan(1);
  expect(result.multi.taxonomyPaths.every(path => path.category1 === "مذهبی")).toBeTruthy();
});

test("v1.8 taxonomy leaves unsupported third-level assignments empty", async ({ page }) => {
  await page.goto("./");
  const result = await page.evaluate(() => {
    const item = { body: "شعری با موضوعی روشن اما بدون زیرموضوع مشخص", tags: ["طبیعت و توصیف"] };
    window.YES_TAXONOMY.classify(item);
    return { category2: item.category2, category3: item.category3, tags: item.tags };
  });
  expect(result.category2).toBe("طبیعت و توصیف");
  expect(result.category3).toBe("");
  expect(result.tags).toEqual(["طبیعت و توصیف"]);
});
