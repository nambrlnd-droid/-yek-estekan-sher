const { test, expect } = require("@playwright/test");

test("v2 renderer creates the selected canvas size and reports missing decorative assets", async ({ page }) => {
  await page.goto("./");
  await page.addScriptTag({ path: "js/image-studio/template-registry.js" });
  await page.addScriptTag({ path: "js/image-studio/poem-layout.js" });
  await page.addScriptTag({ path: "js/image-studio/quality-check.js" });
  await page.addScriptTag({ path: "js/image-studio/renderer.js" });
  const result = await page.evaluate(async () => {
    const manifest = await (await fetch("assets/image-studio/manifest.v2.json")).json();
    const registry = window.YESImageStudioV2Registry.create(manifest);
    const canvas = document.createElement("canvas");
    const rendered = window.YESImageStudioV2Renderer.render({
      registry, layoutEngine: window.YESImageStudioV2Layout, quality: window.YESImageStudioV2Quality,
      canvas, templateId: "sepideh", format: "story",
      text: "به نام تو، ای روشنای جان\nاین شعر برای آزمون رندر نوشته شده است", author: "آزمون"
    });
    return { width: canvas.width, height: canvas.height, rendered: rendered.rendered,
      lines: rendered.poemLayout.lines.length, quality: rendered.quality };
  });
  expect(result.width).toBe(1080);
  expect(result.height).toBe(1920);
  expect(result.rendered).toBeTruthy();
  expect(result.lines).toBeGreaterThan(1);
  expect(result.quality.ok).toBeTruthy();
});

test("quality checker detects overflow and weak contrast", async ({ page }) => {
  await page.goto("./");
  await page.addScriptTag({ path: "js/image-studio/quality-check.js" });
  const result = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width=1080; canvas.height=1080;
    const report = window.YESImageStudioV2Quality.inspect({
      canvas, layout: { canvas:{width:1080,height:1080}, safeArea:{left:.05,right:.05,top:.05,bottom:.05},
        poem:{x:.1,y:.1,w:.8,h:.8}, author:{x:.5,y:.9} },
      template:{palette:{text:"#777777",background:"#FFFFFF"},background:{color:"#FFFFFF"},frame:{id:"none"}},
      poemLayout:{overflow:true,warning:{code:"POEM_OVERFLOW"},fontSize:20,lines:[{text:"test"}]}
    });
    return report;
  });
  expect(result.ok).toBeFalsy();
  expect(result.issues.some(item=>item.code==="POEM_OVERFLOW")).toBeTruthy();
  expect(result.warnings.some(item=>item.code==="LOW_TEXT_CONTRAST")).toBeTruthy();
});


test("renderer blocks poem overflow instead of drawing clipped text", async ({ page }) => {
  await page.goto("./");
  await page.addScriptTag({ path: "js/image-studio/template-registry.js" });
  await page.addScriptTag({ path: "js/image-studio/poem-layout.js" });
  await page.addScriptTag({ path: "js/image-studio/quality-check.js" });
  await page.addScriptTag({ path: "js/image-studio/renderer.js" });
  const result = await page.evaluate(async () => {
    const manifest = await (await fetch("assets/image-studio/manifest.v2.json")).json();
    const registry = window.YESImageStudioV2Registry.create(manifest);
    const canvas = document.createElement("canvas");
    const rendered = window.YESImageStudioV2Renderer.render({
      registry, layoutEngine: window.YESImageStudioV2Layout, quality: window.YESImageStudioV2Quality,
      canvas, templateId: "sepideh", format: "square",
      text: ("این یک شعر بلند برای آزمون جلوگیری از برش متن است\n").repeat(100)
    });
    return { rendered: rendered.rendered, blocked: rendered.blocked, reason: rendered.reason,
      issueCodes: rendered.quality.issues.map(issue => issue.code) };
  });
  expect(result.rendered).toBeFalsy();
  expect(result.blocked).toBeTruthy();
  expect(result.reason).toBe("POEM_OVERFLOW");
  expect(result.issueCodes).toContain("POEM_OVERFLOW");
});


test("v2 renderer supports all 60 template-format combinations without losing source text", async ({ page }) => {
  await page.goto("./");
  await page.addScriptTag({ path: "js/image-studio/template-registry.js" });
  await page.addScriptTag({ path: "js/image-studio/poem-layout.js" });
  await page.addScriptTag({ path: "js/image-studio/quality-check.js" });
  await page.addScriptTag({ path: "js/image-studio/renderer.js" });
  const report = await page.evaluate(async () => {
    const manifest = await (await fetch("assets/image-studio/manifest.v2.json")).json();
    const registry = window.YESImageStudioV2Registry.create(manifest);
    const canvas = document.createElement("canvas");
    const source = "بهار آمد، دل از غم رها شد\n  و این سطر با فاصله آغاز می‌شود؛";
    const rows = [];
    for (const template of manifest.templates) {
      for (const format of ["square", "portrait", "story", "landscape"]) {
        const result = window.YESImageStudioV2Renderer.render({
          registry, layoutEngine: window.YESImageStudioV2Layout,
          quality: window.YESImageStudioV2Quality, canvas,
          templateId: template.id, format, text: source, author: "آزمون"
        });
        rows.push({
          templateId: template.id, format, rendered: result.rendered,
          width: canvas.width, height: canvas.height,
          sourceText: result.poemLayout.sourceText,
          sourcePreserved: result.poemLayout.integrity.sourcePreserved,
          explicitLineBreaks: result.poemLayout.integrity.explicitLineBreaks,
          qualityOk: result.quality.ok
        });
      }
    }
    return rows;
  });
  expect(report).toHaveLength(60);
  for (const row of report) {
    expect(row.rendered, row.templateId + "/" + row.format).toBeTruthy();
    expect(row.qualityOk, row.templateId + "/" + row.format).toBeTruthy();
    expect(row.sourceText).toBe("بهار آمد، دل از غم رها شد\n  و این سطر با فاصله آغاز می‌شود؛");
    expect(row.sourcePreserved).toBeTruthy();
    expect(row.explicitLineBreaks).toBe(1);
  }
});

test("quality checker rejects malformed colors and unsafe geometry as structured issues", async ({ page }) => {
  await page.goto("./");
  await page.addScriptTag({ path: "js/image-studio/quality-check.js" });
  const result = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1080;
    const report = window.YESImageStudioV2Quality.inspect({
      canvas,
      layout: {
        canvas: { width: 1080, height: 1080 },
        safeArea: { left: 0.8, right: 0.3, top: 0.05, bottom: 0.05 },
        poem: { x: 0.2, y: 0.1, w: 0.9, h: 0.8 },
        author: { x: 1.2, y: 0.9 }
      },
      template: { palette: { text: "not-a-color", background: "#FFFFFF" } },
      poemLayout: { overflow: false, fontSize: 20, lines: [{ text: "آزمون" }] }
    });
    return report.issues.map(issue => issue.code);
  });
  expect(result).toContain("INVALID_SAFE_AREA");
  expect(result).toContain("POEM_OUTSIDE_CANVAS");
  expect(result).toContain("INVALID_PALETTE_COLOR");
  expect(result).toContain("AUTHOR_OUTSIDE_CANVAS");
});
