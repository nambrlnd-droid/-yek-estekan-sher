const { test, expect } = require("@playwright/test");

test("v2 registry validates and exposes five families and fifteen templates", async ({ page }) => {
  await page.goto("./");
  await page.addScriptTag({ path: "js/image-studio/template-registry.js" });
  const result = await page.evaluate(async () => {
    const response = await fetch("assets/image-studio/manifest.v2.json");
    const manifest = await response.json();
    const registry = window.YESImageStudioV2Registry.create(manifest);
    return {
      families: registry.listFamilies().length,
      templates: registry.listTemplates().length,
      layouts: registry.getLayout("sepideh", "story").canvas,
      legacy: registry.getLegacyTemplateIds()
    };
  });
  expect(result.families).toBe(5);
  expect(result.templates).toBe(15);
  expect(result.layouts).toEqual({ width: 1080, height: 1920 });
  expect(result.legacy).toContain("classic");
});

test("Persian layout preserves explicit breaks, punctuation and reports overflow without truncation", async ({ page }) => {
  await page.goto("./");
  await page.addScriptTag({ path: "js/image-studio/poem-layout.js" });
  const result = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const text = "به نام تو، ای روشنای جان\nاین مصرع با نشانه‌گذاری؛ و نیم‌فاصله می‌آید";
    const fit = window.YESImageStudioV2Layout.layout({
      context: ctx, text, width: 460, height: 420,
      preferredFontSize: 34, minimumFontSize: 18,
      fontFamily: "Tahoma", fontFallback: ["Tahoma", "sans-serif"]
    });
    const overflow = window.YESImageStudioV2Layout.layout({
      context: ctx, text: (text + "\n").repeat(40), width: 220, height: 90,
      preferredFontSize: 34, minimumFontSize: 18
    });
    return { fit, overflow };
  });
  expect(result.fit.sourceText).toBe("به نام تو، ای روشنای جان\nاین مصرع با نشانه‌گذاری؛ و نیم‌فاصله می‌آید");
  expect(result.fit.integrity.explicitLineBreaks).toBe(1);
  expect(result.fit.lines.map(line => line.text).join("\n")).toContain("نشانه‌گذاری؛");
  expect(result.overflow.overflow).toBeTruthy();
  expect(result.overflow.warning.code).toBe("POEM_OVERFLOW");
  expect(result.overflow.sourceText.length).toBeGreaterThan(1000);
});

test("registry rejects a manifest with a duplicate template id", async ({ page }) => {
  await page.goto("./");
  await page.addScriptTag({ path: "js/image-studio/template-registry.js" });
  const rejected = await page.evaluate(async () => {
    const manifest = await (await fetch("assets/image-studio/manifest.v2.json")).json();
    manifest.templates[1].id = manifest.templates[0].id;
    try { window.YESImageStudioV2Registry.create(manifest); return false; }
    catch (_) { return true; }
  });
  expect(rejected).toBeTruthy();
});
